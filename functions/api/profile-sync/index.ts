import { validateProfileInput } from '../../_shared/profile';

type Env = { DB: D1Database; IMAGES: R2Bucket };

type ProfileSyncBody = {
  nickname?: unknown;
  age?: unknown;
  location?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
};

function keyFromAvatarUrl(avatarUrl: string) {
  try {
    const url = new URL(avatarUrl, 'https://local.invalid');
    return url.pathname === '/api/profile-image' ? url.searchParams.get('key') : null;
  } catch {
    return null;
  }
}

async function ensureProfileSyncColumns(env: Env) {
  const columns = [
    'alter table talk_posts add column profile_id text',
    'alter table talk_posts add column avatar_url text',
    'alter table recent_users add column avatar_url text',
    'alter table chat_rooms add column direct_key text',
    'alter table chat_rooms add column participant_a_id text',
    'alter table chat_rooms add column participant_a_nickname text',
    'alter table chat_rooms add column participant_b_id text',
    'alter table chat_rooms add column participant_b_nickname text',
    'alter table chat_messages add column sender_profile_id text',
  ];

  for (const query of columns) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // Legacy databases may already contain the column.
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
  const newAvatarKey = keyFromAvatarUrl(avatarUrl);

  if (avatarUrl && !newAvatarKey?.startsWith(`profiles/${profileId}/`)) {
    return Response.json({ error: '내가 업로드한 프로필 이미지만 사용할 수 있어요.' }, { status: 403 });
  }

  const previous = await env.DB.prepare(
    'select avatar_url from recent_users where id = ? limit 1',
  ).bind(profileId).first<{ avatar_url?: string | null }>();
  const previousAvatarKey = keyFromAvatarUrl(previous?.avatar_url?.trim() ?? '');

  await env.DB.batch([
    env.DB.prepare(
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
    ).bind(profileId, nickname, age, location, bio, avatarUrl),
    env.DB.prepare(
      'update talk_posts set nickname = ?, age = ?, location = ?, avatar_url = ? where profile_id = ?',
    ).bind(nickname, age, location, avatarUrl, profileId),
    env.DB.prepare(
      'update chat_rooms set participant_a_nickname = ?, updated_at = datetime("now") where participant_a_id = ?',
    ).bind(nickname, profileId),
    env.DB.prepare(
      'update chat_rooms set participant_b_nickname = ?, updated_at = datetime("now") where participant_b_id = ?',
    ).bind(nickname, profileId),
    env.DB.prepare(
      'update chat_messages set sender_nickname = ? where sender_profile_id = ?',
    ).bind(nickname, profileId),
  ]);

  if (
    previousAvatarKey?.startsWith(`profiles/${profileId}/`)
    && previousAvatarKey !== newAvatarKey
  ) {
    try {
      await env.IMAGES.delete(previousAvatarKey);
    } catch {
      // The profile update is already committed; stale object cleanup can be retried later.
    }
  }

  return Response.json({ ok: true });
};
