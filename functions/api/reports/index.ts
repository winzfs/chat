import { isChatRoomParticipant } from '../../_shared/auth';

type Env = { DB: D1Database; ADMIN_PROFILE_IDS?: string };

type ReportBody = {
  reporter_id?: string;
  reported_id?: string;
  reported_nickname?: string;
  room_id?: string;
  reason?: string;
  detail?: string;
};

type ReportActionBody = {
  id?: string;
  status?: string;
  admin_note?: string;
  suspend_days?: number | string | null;
};

type ClearSuspensionBody = {
  profile_id?: string;
};

const allowedStatuses = new Set(['open', 'reviewing', 'resolved', 'dismissed', 'closed']);
const allowedSuspendDays = new Set([0, 1, 7, 30, -1]);

function authenticatedProfileId(request: Request) {
  return request.headers.get('x-auth-profile-id')?.trim() ?? '';
}

function isAdmin(env: Env, profileId: string) {
  const adminIds = (env.ADMIN_PROFILE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return Boolean(profileId && adminIds.includes(profileId));
}

async function ensureModerationSchema(env: Env) {
  await env.DB.prepare(
    `create table if not exists reports (
      id text primary key,
      reporter_id text not null,
      reported_id text not null,
      reported_nickname text,
      room_id text,
      reason text not null,
      detail text,
      status text not null default 'open',
      admin_note text,
      handled_by text,
      handled_at text,
      created_at text not null default (datetime('now'))
    )`,
  ).run();

  for (const query of [
    'alter table reports add column admin_note text',
    'alter table reports add column handled_by text',
    'alter table reports add column handled_at text',
  ]) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // Existing environments may already have the column.
    }
  }

  await env.DB.prepare(
    `create table if not exists user_suspensions (
      profile_id text primary key,
      reason text not null,
      suspended_until text,
      created_by text not null,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare('create index if not exists reports_status_created_idx on reports(status, created_at desc)').run();
  await env.DB.prepare('create index if not exists reports_reported_idx on reports(reported_id, created_at desc)').run();
  await env.DB.prepare('create index if not exists user_suspensions_until_idx on user_suspensions(suspended_until)').run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureModerationSchema(env);

  const adminId = authenticatedProfileId(request);
  if (!isAdmin(env, adminId)) {
    return Response.json({ error: '운영자만 신고 목록에 접근할 수 있어요.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status')?.trim() ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 100);
  const select = `select id, reporter_id, reported_id, reported_nickname, room_id, reason, detail,
                         status, admin_note, handled_by, handled_at, created_at
                  from reports`;
  const query = status && allowedStatuses.has(status)
    ? env.DB.prepare(`${select} where status = ? order by created_at desc limit ?`).bind(status, limit)
    : env.DB.prepare(`${select} order by created_at desc limit ?`).bind(limit);

  const { results } = await query.all();
  return Response.json({ reports: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureModerationSchema(env);

  const authProfileId = authenticatedProfileId(request);
  if (!authProfileId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const body = await request.json() as ReportBody;
  const declaredReporterId = body.reporter_id?.trim() ?? '';
  const reporterId = authProfileId;
  const reportedId = body.reported_id?.trim() ?? '';
  const reportedNickname = body.reported_nickname?.trim().slice(0, 20) || '상대방';
  const roomId = body.room_id?.trim() ?? '';
  const reason = body.reason?.trim().slice(0, 50) || '기타';
  const detail = body.detail?.trim().slice(0, 500) || '';

  if (declaredReporterId && declaredReporterId !== reporterId) {
    return Response.json({ error: '다른 사용자 이름으로 신고할 수 없어요.' }, { status: 403 });
  }
  if (!reportedId) return Response.json({ error: '신고 대상 정보가 필요해요.' }, { status: 400 });
  if (reporterId === reportedId) return Response.json({ error: '내 프로필은 신고할 수 없어요.' }, { status: 400 });

  if (roomId) {
    const reporterInRoom = await isChatRoomParticipant(env, roomId, reporterId);
    const reportedInRoom = await isChatRoomParticipant(env, roomId, reportedId);
    if (!reporterInRoom || !reportedInRoom) {
      return Response.json({ error: '해당 채팅방과 관련된 사용자만 신고할 수 있어요.' }, { status: 403 });
    }
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `insert into reports (id, reporter_id, reported_id, reported_nickname, room_id, reason, detail)
     values (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, reporterId, reportedId, reportedNickname, roomId, reason, detail).run();

  return Response.json({ ok: true, id }, { status: 201 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) => {
  await ensureModerationSchema(env);

  const adminId = authenticatedProfileId(request);
  if (!isAdmin(env, adminId)) {
    return Response.json({ error: '운영자만 신고를 처리할 수 있어요.' }, { status: 403 });
  }

  const body = await request.json() as ReportActionBody;
  const id = body.id?.trim() ?? '';
  const status = body.status?.trim() ?? '';
  const adminNote = body.admin_note?.trim().slice(0, 1000) ?? '';
  const suspendDays = Number(body.suspend_days ?? 0);

  if (!id || !allowedStatuses.has(status)) {
    return Response.json({ error: '신고 ID와 올바른 상태값이 필요해요.' }, { status: 400 });
  }
  if (!allowedSuspendDays.has(suspendDays)) {
    return Response.json({ error: '올바른 정지 기간을 선택해주세요.' }, { status: 400 });
  }

  const report = await env.DB.prepare(
    'select id, reported_id, reason from reports where id = ? limit 1',
  ).bind(id).first<{ id: string; reported_id: string; reason: string }>();
  if (!report) return Response.json({ error: '신고를 찾을 수 없어요.' }, { status: 404 });
  if (report.reported_id === adminId) {
    return Response.json({ error: '운영자 본인 계정은 이 화면에서 정지할 수 없어요.' }, { status: 400 });
  }

  const handled = status === 'resolved' || status === 'dismissed' || status === 'closed';
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `update reports
       set status = ?, admin_note = ?, handled_by = ?, handled_at = ?
       where id = ?`,
    ).bind(status, adminNote, adminId, handled ? new Date().toISOString() : null, id),
  ];

  if (suspendDays !== 0) {
    const suspendedUntil = suspendDays === -1
      ? null
      : new Date(Date.now() + suspendDays * 24 * 60 * 60 * 1000).toISOString();
    statements.push(
      env.DB.prepare(
        `insert into user_suspensions (profile_id, reason, suspended_until, created_by, created_at, updated_at)
         values (?, ?, ?, ?, datetime('now'), datetime('now'))
         on conflict(profile_id) do update set
           reason = excluded.reason,
           suspended_until = excluded.suspended_until,
           created_by = excluded.created_by,
           updated_at = datetime('now')`,
      ).bind(report.reported_id, adminNote || report.reason, suspendedUntil, adminId),
    );
  }

  await env.DB.batch(statements);
  return Response.json({ ok: true, status, suspended: suspendDays !== 0 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  await ensureModerationSchema(env);

  const adminId = authenticatedProfileId(request);
  if (!isAdmin(env, adminId)) {
    return Response.json({ error: '운영자만 정지를 해제할 수 있어요.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as ClearSuspensionBody;
  const profileId = body.profile_id?.trim() ?? '';
  if (!profileId) return Response.json({ error: '정지 해제할 profile_id가 필요해요.' }, { status: 400 });
  if (profileId === adminId) {
    return Response.json({ error: '운영자 본인 계정은 이 화면에서 변경할 수 없어요.' }, { status: 400 });
  }

  await env.DB.prepare('delete from user_suspensions where profile_id = ?').bind(profileId).run();

  return Response.json({ ok: true, unsuspended: true, profile_id: profileId });
};