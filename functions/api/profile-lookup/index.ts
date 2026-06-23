type Env = { DB: D1Database };

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
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureRecentUsersTable(env);

  const url = new URL(request.url);
  const profileId = url.searchParams.get('profile_id')?.trim().slice(0, 64) ?? '';
  const nickname = url.searchParams.get('nickname')?.trim().slice(0, 12) ?? '';

  if (!profileId && !nickname) {
    return Response.json({ error: 'profile_id 또는 nickname이 필요해요.' }, { status: 400 });
  }

  const profile = profileId
    ? await env.DB.prepare(
      `select id, nickname, age, location, bio, avatar_url, online
       from recent_users
       where id = ?
       limit 1`,
    ).bind(profileId).first()
    : await env.DB.prepare(
      `select id, nickname, age, location, bio, avatar_url, online
       from recent_users
       where nickname = ?
       order by last_seen_at desc
       limit 1`,
    ).bind(nickname).first();

  if (!profile) {
    return Response.json({ profile: null }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return Response.json({ profile: { ...profile, online: Boolean(profile.online) } }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
