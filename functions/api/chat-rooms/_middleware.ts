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

function directReference(first: string, second: string) {
  return [first, second].sort().join(':');
}

async function latestCharge(env: Env, profileId: string, referenceId: string) {
  try {
    return await env.DB.prepare(
      `select id, amount
       from point_transactions
       where profile_id = ? and reason = 'direct_chat' and reference_id = ?
       order by created_at desc
       limit 1`,
    ).bind(profileId, referenceId).first<ChargeRow>();
  } catch {
    return null;
  }
}

async function restoreNewCharge(
  env: Env,
  profileId: string,
  referenceId: string,
  previousChargeId?: string | null,
) {
  const charge = await latestCharge(env, profileId, referenceId);
  if (!charge || charge.id === previousChargeId || Number(charge.amount) !== -100) return false;

  const restoreId = `restore:${charge.id}`;
  await env.DB.batch([
    env.DB.prepare(
      `update user_points
       set balance = balance + 100, updated_at = datetime('now')
       where profile_id = ?
         and not exists (select 1 from point_transactions where id = ?)`,
    ).bind(profileId, restoreId),
    env.DB.prepare(
      `insert or ignore into point_transactions
       (id, profile_id, amount, reason, reference_id, description)
       values (?, ?, 100, 'direct_chat_restore', ?, '채팅방 생성 실패 포인트 복구')`,
    ).bind(restoreId, profileId, referenceId),
  ]);

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
  const previousCharge = referenceId
    ? await latestCharge(env, authenticatedId, referenceId)
    : null;

  let response: Response;
  try {
    response = await next();
  } catch (error) {
    if (referenceId) {
      await restoreNewCharge(env, authenticatedId, referenceId, previousCharge?.id);
    }
    throw error;
  }

  if (request.method === 'POST' && referenceId) {
    const room = response.ok
      ? await response.clone().json().catch(() => null) as ChatRoomSummary | null
      : null;

    if (!response.ok || !room?.id) {
      await restoreNewCharge(env, authenticatedId, referenceId, previousCharge?.id);
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
