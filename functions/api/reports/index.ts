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

type ReportStatusBody = {
  id?: string;
  status?: string;
};

const allowedStatuses = new Set(['open', 'reviewing', 'closed']);

function getRequesterProfileId(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-profile-id')?.trim() || url.searchParams.get('admin_profile_id')?.trim() || '';
}

function isAdmin(env: Env, profileId: string) {
  const adminIds = (env.ADMIN_PROFILE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return Boolean(profileId && adminIds.includes(profileId));
}

function requireAdmin(env: Env, request: Request) {
  return isAdmin(env, getRequesterProfileId(request));
}

async function ensureReportsTable(env: Env) {
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
      created_at text not null default (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare('create index if not exists reports_status_created_idx on reports(status, created_at desc)').run();
  await env.DB.prepare('create index if not exists reports_reported_idx on reports(reported_id, created_at desc)').run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureReportsTable(env);

  if (!requireAdmin(env, request)) {
    return Response.json({ error: '운영자만 신고 목록에 접근할 수 있어요.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status')?.trim() ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 100);

  const query = status && allowedStatuses.has(status)
    ? env.DB.prepare(
      `select id, reporter_id, reported_id, reported_nickname, room_id, reason, detail, status, created_at
       from reports
       where status = ?
       order by created_at desc
       limit ?`,
    ).bind(status, limit)
    : env.DB.prepare(
      `select id, reporter_id, reported_id, reported_nickname, room_id, reason, detail, status, created_at
       from reports
       order by created_at desc
       limit ?`,
    ).bind(limit);

  const { results } = await query.all();
  return Response.json({ reports: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureReportsTable(env);

  const body = await request.json() as ReportBody;
  const reporterId = body.reporter_id?.trim() ?? '';
  const reportedId = body.reported_id?.trim() ?? '';
  const reportedNickname = body.reported_nickname?.trim().slice(0, 20) || '상대방';
  const roomId = body.room_id?.trim() ?? '';
  const reason = body.reason?.trim().slice(0, 50) || '기타';
  const detail = body.detail?.trim().slice(0, 500) || '';

  if (!reporterId || !reportedId) {
    return Response.json({ error: '신고자와 신고 대상 정보가 필요해요.' }, { status: 400 });
  }

  if (reporterId === reportedId) {
    return Response.json({ error: '내 프로필은 신고할 수 없어요.' }, { status: 400 });
  }

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
  await ensureReportsTable(env);

  if (!requireAdmin(env, request)) {
    return Response.json({ error: '운영자만 신고 상태를 변경할 수 있어요.' }, { status: 403 });
  }

  const body = await request.json() as ReportStatusBody;
  const id = body.id?.trim() ?? '';
  const status = body.status?.trim() ?? '';

  if (!id || !allowedStatuses.has(status)) {
    return Response.json({ error: '신고 ID와 올바른 상태값이 필요해요.' }, { status: 400 });
  }

  await env.DB.prepare('update reports set status = ? where id = ?').bind(status, id).run();
  return Response.json({ ok: true });
};
