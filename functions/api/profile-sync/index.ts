type Env = { DB: D1Database };

type ProfileSyncBody = {
  previous_nickname?: string;
  nickname?: string;
  age?: number;
  location?: string;
  bio?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as ProfileSyncBody;
  const previousNickname = body.previous_nickname?.trim().slice(0, 20) || '';
  const nickname = body.nickname?.trim().slice(0, 20) || '익명';
  const age = Number.isFinite(body.age) ? body.age : 25;
  const location = body.location?.trim().slice(0, 20) || '내 주변';
  const bio = body.bio?.trim().slice(0, 80) || '';

  if (previousNickname && previousNickname !== nickname) {
    await env.DB.prepare('update chat_messages set sender_nickname = ? where sender_nickname = ?').bind(nickname, previousNickname).run();
    await env.DB.prepare('update talk_posts set nickname = ?, age = ?, location = ? where nickname = ?').bind(nickname, age, location, previousNickname).run();
    await env.DB.prepare('delete from recent_users where id = ?').bind(previousNickname).run();
  }

  await env.DB.prepare(
    `insert into recent_users (id, nickname, age, location, bio, online, last_seen_at, updated_at)
     values (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
     on conflict(id) do update set
       nickname = excluded.nickname,
       age = excluded.age,
       location = excluded.location,
       bio = excluded.bio,
       online = 1,
       last_seen_at = datetime('now'),
       updated_at = datetime('now')`,
  ).bind(nickname, nickname, age, location, bio).run();

  return Response.json({ ok: true });
};
