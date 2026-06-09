type Env = { DB: D1Database };

type ReportBody = {
  reporter_id?: string;
  reported_id?: string;
  reported_nickname?: string;
  room_id?: string;
  reason?: string;
  detail?: string;
};

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

  const id = crypto.randomUUID();

  await env.DB.prepare(
    `insert into reports (id, reporter_id, reported_id, reported_nickname, room_id, reason, detail)
     values (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, reporterId, reportedId, reportedNickname, roomId, reason, detail).run();

  return Response.json({ ok: true, id }, { status: 201 });
};