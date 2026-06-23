type Env = { DB: D1Database };

type ProfileSyncBody = {
  profile_id?: string;
  previous_nickname?: string;
  nickname?: string;
  age?: number;
  location?: string;
  bio?: string;
  avatar_url?: string;
};

async function ensureProfileSyncColumns(env: Env) {
  const talkColumns = [
    'alter table talk_posts add column profile_id text',
    'alter table talk_posts add column avatar_url text',
  ];

  for (const query of talkColumns) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // column already exists
    }
  }

  try {
    await env.DB.prepare('alter table recent_users add column avatar_url text').run();
  } catch {
    // column already exists
  }

  const chatRoomColumns = [
    'alter table chat_rooms add column direct_key text',
    'alter table chat_rooms add column participant_a_id text',
    'alter table chat_rooms add column participant_a_nickname text',
    'alter table chat_rooms add column participant_b_id text',
    'alter table chat_rooms add column participant_b_nickname text',
    'alter table chat_messages add column sender_profile_id text',
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
  const profileId = request.headers.get('x-auth-profile-id')?.trim() || '';
  const nickname = body.nickname?.trim().slice(0, 20) || '익명';
  const age = Number.isFinite(body.age) ? body.age : 25;
  const location = body.location?.trim().slice(0, 20) || '내 주변';
  const bio = body.bio?.trim().slice(0, 80) || '';
  const avatarUrl = body.avatar_url?.trim() || '';

  if (!profileId) {
    return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  if (!Number.isInteger(age) || age < 20 || age > 80) {
    return Response.json({ error: '나이는 20세 이상 80세 이하로 입력해주세요.' }, { status: 400 });
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
  ).bind(profileId, nickname, age, location, bio, avatarUrl).run();

  await env.DB.prepare(
    'update talk_posts set nickname = ?, age = ?, location = ?, avatar_url = ? where profile_id = ?',
  ).bind(nickname, age, location, avatarUrl, profileId).run();

  await env.DB.prepare(
    'update chat_rooms set participant_a_nickname = ?, updated_at = datetime("now") where participant_a_id = ?',
  ).bind(nickname, profileId).run();

  await env.DB.prepare(
    'update chat_rooms set participant_b_nickname = ?, updated_at = datetime("now") where participant_b_id = ?',
  ).bind(nickname, profileId).run();

  await env.DB.prepare(
    'update chat_messages set sender_nickname = ? where sender_profile_id = ?',
  ).bind(nickname, profileId).run();

  return Response.json({ ok: true });
};
