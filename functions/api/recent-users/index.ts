type Env = { DB: D1Database };

type RecentUserBody = {
  profile_id?: string;
  nickname?: string;
  age?: number;
  location?: string;
  bio?: string;
  avatar_url?: string;
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
    // column already exists
  }

  await env.DB.prepare(
    'create index if not exists recent_users_last_seen_idx on recent_users(last_seen_at desc)',
  ).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  await ensureRecentUsersTable(env);

  const { results } = await env.DB.prepare(
    'select id, nickname, age, location, bio, avatar_url, online, last_seen_at from recent_users order by last_seen_at desc limit 30',
  ).all();

  const users = (results ?? []).map((row) => ({
    ...row,
    online: Boolean(row.online),
  }));

  return Response.json({ users });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureRecentUsersTable(env);

  const body = await request.json() as RecentUserBody;
  const nickname = body.nickname?.trim().slice(0, 20) || '익명';
  const id = body.profile_id?.trim() || nickname;
  const age = Number.isFinite(body.age) ? body.age : 25;
  const location = body.location?.trim().slice(0, 20) || '내 주변';
  const bio = body.bio?.trim().slice(0, 80) || '';
  const avatarUrl = body.avatar_url?.trim() || '';

  if (id !== nickname) {
    await env.DB.prepare('delete from recent_users where id = ?').bind(nickname).run();
  }

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
