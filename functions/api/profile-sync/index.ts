import { validateProfileInput } from '../../_shared/profile';

type Env = { DB: D1Database };

type ProfileSyncBody = {
  nickname?: unknown;
  age?: unknown;
  location?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
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

  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  if (!profileId) {
    return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  const body = await request.json() as ProfileSyncBody;
  const validated = validateProfileInput(body);
  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const { nickname, age, location, bio, avatarUrl } = validated.profile;

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
