import { validateProfileInput } from '../../_shared/profile';

type Env = { DB: D1Database };

type RecentUserBody = {
  nickname?: unknown;
  age?: unknown;
  location?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
};

async function ensureRecentUsersTable(env: Env) {
  await env.DB.prepare(
    `create table if not exists recent_users (
      id text primary key,
      nickname text not null,
      age integer,
      location text,
      bio text,
      online integer not null default 1,
      last_seen_at text not null default (datetime('now')),
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    )`,
  ).run();

  try {
    await env.DB.prepare('alter table recent_users add column avatar_url text').run();
  } catch {
    // Legacy databases may already contain the column.
  }

  await env.DB.prepare(
    `create table if not exists user_blocks (
      blocker_id text not null,
      blocked_id text not null,
      blocked_nickname text,
      created_at text not null default (datetime('now')),
      primary key (blocker_id, blocked_id)
    )`,
  ).run();

  await env.DB.prepare('create index if not exists recent_users_last_seen_idx on recent_users(last_seen_at desc)').run();
  await env.DB.prepare('create index if not exists user_blocks_blocked_idx on user_blocks(blocked_id)').run();
}

function authenticatedProfileId(request: Request) {
  return request.headers.get('x-auth-profile-id')?.trim() ?? '';
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureRecentUsersTable(env);
  const viewerId = authenticatedProfileId(request);

  if (!viewerId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const { results } = await env.DB.prepare(
    `select id, nickname, age, location, bio, avatar_url, online, last_seen_at
     from recent_users u
     where u.id != ?
       and not exists (
         select 1 from user_blocks b
         where (b.blocker_id = ? and b.blocked_id = u.id)
            or (b.blocked_id = ? and b.blocker_id = u.id)
       )
     order by last_seen_at desc
     limit 30`,
  ).bind(viewerId, viewerId, viewerId).all();

  const users = (results ?? []).map((row) => ({
    ...row,
    online: Boolean(row.online),
  }));

  return Response.json({ users });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureRecentUsersTable(env);

  const id = authenticatedProfileId(request);
  if (!id) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const body = await request.json() as RecentUserBody;
  const validation = validateProfileInput(body);
  if ('error' in validation) return Response.json({ error: validation.error }, { status: 400 });

  const { nickname, age, location, bio, avatarUrl } = validation.profile;
  await env.DB.prepare(
    `insert into recent_users (id, nickname, age, location, bio, avatar_url, online, last_seen_at, updated_at)
     values (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
     on conflict(id) do update set
       nickname = excluded.nickname,
       age = excluded.age,
       location = excluded.location,
       bio = excluded.bio,
       avatar_url = excluded.avatar_url,
       online = 1,
       last_seen_at = datetime('now'),
       updated_at = datetime('now')`,
  ).bind(id, nickname, age, location, bio, avatarUrl).run();

  return Response.json({ ok: true });
};
