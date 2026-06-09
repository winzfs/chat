type Env = { DB: D1Database };

type BlockBody = {
  blocker_id?: string;
  blocked_id?: string;
  blocked_nickname?: string;
};

async function ensureUserBlocksTable(env: Env) {
  await env.DB.prepare(
    `create table if not exists user_blocks (
      blocker_id text not null,
      blocked_id text not null,
      blocked_nickname text,
      created_at text not null default (datetime('now')),
      primary key (blocker_id, blocked_id)
    )`,
  ).run();

  await env.DB.prepare('create index if not exists user_blocks_blocked_idx on user_blocks(blocked_id)').run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureUserBlocksTable(env);

  const profileId = new URL(request.url).searchParams.get('profile_id')?.trim() ?? '';

  if (!profileId) {
    return Response.json({ error: 'profile_id가 필요해요.' }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    'select blocked_id, blocked_nickname, created_at from user_blocks where blocker_id = ? order by created_at desc limit 100',
  ).bind(profileId).all();

  return Response.json({ blocks: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureUserBlocksTable(env);

  const body = await request.json() as BlockBody;
  const blockerId = body.blocker_id?.trim() ?? '';
  const blockedId = body.blocked_id?.trim() ?? '';
  const blockedNickname = body.blocked_nickname?.trim().slice(0, 20) || '상대방';

  if (!blockerId || !blockedId) {
    return Response.json({ error: 'blocker_id와 blocked_id가 필요해요.' }, { status: 400 });
  }

  if (blockerId === blockedId) {
    return Response.json({ error: '내 프로필은 차단할 수 없어요.' }, { status: 400 });
  }

  await env.DB.prepare(
    `insert into user_blocks (blocker_id, blocked_id, blocked_nickname)
     values (?, ?, ?)
     on conflict(blocker_id, blocked_id) do update set
       blocked_nickname = excluded.blocked_nickname`,
  ).bind(blockerId, blockedId, blockedNickname).run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  await ensureUserBlocksTable(env);

  const url = new URL(request.url);
  const blockerId = url.searchParams.get('blocker_id')?.trim() ?? '';
  const blockedId = url.searchParams.get('blocked_id')?.trim() ?? '';

  if (!blockerId || !blockedId) {
    return Response.json({ error: 'blocker_id와 blocked_id가 필요해요.' }, { status: 400 });
  }

  await env.DB.prepare('delete from user_blocks where blocker_id = ? and blocked_id = ?').bind(blockerId, blockedId).run();

  return Response.json({ ok: true });
};