type Env = { DB: D1Database };

type ProfileSyncBody = {
  profile_id?: string;
  previous_nickname?: string;
  nickname?: string;
  age?: number;
  location?: string;
  bio?: string;
};

async function ensureProfileSyncColumns(env: Env) {
  try {
    await env.DB.prepare('alter table talk_posts add column profile_id text').run();
  } catch {
    // column already exists
  }

  const chatRoomColumns = [
    'alter table chat_rooms add column direct_key text',
    'alter table chat_rooms add column participant_a_id text',
    'alter table chat_rooms add column participant_a_nickname text',
    'alter table chat_rooms add column participant_b_id text',
    'alter table chat_rooms add column participant_b_nickname text',
  ];

  for (const query of chatRoomColumns) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // column already exists
    }
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureProfileSyncColumns(env);

  const body = await request.json() as ProfileSyncBody;
  const profileId = body.profile_id?.trim() || '';
  const previousNickname = body.previous_nickname?.trim().slice(0, 20) || '';
  const nickname = body.nickname?.trim().slice(0, 20) || '익명';
  const age = Number.isFinite(body.age) ? body.age : 25;
  const location = body.location?.trim().slice(0, 20) || '내 주변';
  const bio = body.bio?.trim().slice(0, 80) || '';

  if (!profileId) {
    return Response.json({ error: 'profile_id가 필요해요.' }, { status: 400 });
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
  ).bind(profileId, nickname, age, location, bio).run();

  await env.DB.prepare(
    'update talk_posts set nickname = ?, age = ?, location = ? where profile_id = ?',
  ).bind(nickname, age, location, profileId).run();

  await env.DB.prepare(
    'update chat_rooms set participant_a_nickname = ?, updated_at = datetime("now") where participant_a_id = ?',
  ).bind(nickname, profileId).run();

  await env.DB.prepare(
    'update chat_rooms set participant_b_nickname = ?, updated_at = datetime("now") where participant_b_id = ?',
  ).bind(nickname, profileId).run();

  if (previousNickname && previousNickname !== nickname) {
    await env.DB.prepare('update chat_messages set sender_nickname = ? where sender_nickname = ?').bind(nickname, previousNickname).run();
    await env.DB.prepare('update talk_posts set nickname = ?, age = ?, location = ? where nickname = ? and (profile_id is null or profile_id = "")').bind(nickname, age, location, previousNickname).run();
    await env.DB.prepare('delete from recent_users where id = ?').bind(previousNickname).run();
  }

  return Response.json({ ok: true });
};
