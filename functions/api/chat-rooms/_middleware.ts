import { jsonError } from '../../_shared/auth';

type Env = { DB: D1Database };

type ChatRoomSummary = {
  id?: string | null;
  participant_a_id?: string | null;
  participant_b_id?: string | null;
  room_owner_profile_id?: string | null;
};

type ChatRoomBody = {
  profile_id?: unknown;
  peer_id?: unknown;
};

type ChargeRow = {
  id: string;
  amount: number;
};

const DIRECT_CHAT_COST = 100;

function directReference(first: string, second: string) {
  return [first, second].sort().join(':');
}

async function latestCharge(env: Env, profileId: string, referenceId: string) {
  try {
    return await env.DB.prepare(
      `select id, amount
       from point_transactions
       where profile_id = ? and reason = 'direct_chat' and reference_id = ?
       order by rowid desc
       limit 1`,
    ).bind(profileId, referenceId).first<ChargeRow>();
  } catch {
    return null;
  }
}

async function latestTransactionId(env: Env, profileId: string) {
  try {
    const row = await env.DB.prepare(
      'select id from point_transactions where profile_id = ? order by rowid desc limit 1',
    ).bind(profileId).first<{ id?: string | null }>();
    return row?.id ?? '';
  } catch {
    return '';
  }
}

async function pointBalance(env: Env, profileId: string) {
  try {
    const row = await env.DB.prepare(
      'select balance from user_points where profile_id = ? limit 1',
    ).bind(profileId).first<{ balance?: number | null }>();
    return Number(row?.balance ?? 0);
  } catch {
    return 0;
  }
}

async function restorePoints(env: Env, profileId: string, referenceId: string, restoreId: string) {
  await env.DB.batch([
    env.DB.prepare(
      `update user_points
       set balance = balance + ?, updated_at = datetime('now')
       where profile_id = ?
         and not exists (select 1 from point_transactions where id = ?)`,
    ).bind(DIRECT_CHAT_COST, profileId, restoreId),
    env.DB.prepare(
      `insert or ignore into point_transactions
       (id, profile_id, amount, reason, reference_id, description)
       values (?, ?, ?, 'direct_chat_restore', ?, '채팅방 생성 실패 포인트 복구')`,
    ).bind(restoreId, profileId, DIRECT_CHAT_COST, referenceId),
  ]);
}

async function restoreNewCharge(
  env: Env,
  profileId: string,
  referenceId: string,
  previousChargeId?: string | null,
) {
  const charge = await latestCharge(env, profileId, referenceId);
  if (!charge || charge.id === previousChargeId || Number(charge.amount) !== -DIRECT_CHAT_COST) return false;

  await restorePoints(env, profileId, referenceId, `restore:${charge.id}`);
  return true;
}

async function restoreUntrackedDrop(
  env: Env,
  profileId: string,
  referenceId: string,
  balanceBefore: number,
  transactionBefore: string,
  attemptId: string,
) {
  const [balanceAfter, transactionAfter] = await Promise.all([
    pointBalance(env, profileId),
    latestTransactionId(env, profileId),
  ]);

  if (balanceAfter !== balanceBefore - DIRECT_CHAT_COST || transactionAfter !== transactionBefore) return false;

  await restorePoints(env, profileId, referenceId, `restore-attempt:${attemptId}`);
  return true;
}

export const onRequest: PagesFunction<Env> = async ({ env, request, next }) => {
  const authenticatedId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  if (!authenticatedId) return jsonError('로그인이 필요해요.', 401);

  const body = request.method === 'GET'
    ? null
    : await request.clone().json().catch(() => ({})) as ChatRoomBody;
  const declaredId = request.method === 'GET'
    ? new URL(request.url).searchParams.get('profile_id')?.trim() ?? ''
    : String(body?.profile_id ?? '').trim();

  if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
  if (declaredId !== authenticatedId) return jsonError('다른 사용자 권한으로 요청할 수 없어요.', 403);

  const peerId = String(body?.peer_id ?? '').trim();
  const referenceId = peerId ? directReference(authenticatedId, peerId) : '';
  const attemptId = crypto.randomUUID();
  const [previousCharge, balanceBefore, transactionBefore] = referenceId
    ? await Promise.all([
      latestCharge(env, authenticatedId, referenceId),
      pointBalance(env, authenticatedId),
      latestTransactionId(env, authenticatedId),
    ])
    : [null, 0, ''];

  const restoreFailedRequest = async () => {
    if (!referenceId) return;
    const restored = await restoreNewCharge(env, authenticatedId, referenceId, previousCharge?.id);
    if (!restored) {
      await restoreUntrackedDrop(
        env,
        authenticatedId,
        referenceId,
        balanceBefore,
        transactionBefore,
        attemptId,
      );
    }
  };

  let response: Response;
  try {
    response = await next();
  } catch (error) {
    await restoreFailedRequest();
    throw error;
  }

  if (request.method === 'POST' && referenceId) {
    const room = response.ok
      ? await response.clone().json().catch(() => null) as ChatRoomSummary | null
      : null;

    if (!response.ok || !room?.id) {
      await restoreFailedRequest();
      if (response.ok) {
        return jsonError('채팅방을 만들지 못했어요. 차감된 포인트는 복구했어요.', 500);
      }
    }
  }

  if (request.method !== 'GET' || !response.ok) return response;

  const data = await response.clone().json().catch(() => null) as { rooms?: ChatRoomSummary[] } | null;
  if (!data?.rooms) return response;

  const rooms = data.rooms.filter((room) => (
    room.participant_a_id === authenticatedId
    || room.participant_b_id === authenticatedId
    || room.room_owner_profile_id === authenticatedId
  ));

  return Response.json({ ...data, rooms }, {
    status: response.status,
    headers: response.headers,
  });
};
