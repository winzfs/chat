import { validateImageFile } from '../../_shared/images';

type Env = { DB: D1Database; IMAGES: R2Bucket };

function keyFromAvatarUrl(avatarUrl: string) {
  try {
    const url = new URL(avatarUrl, 'https://local.invalid');
    return url.pathname === '/api/profile-image' ? url.searchParams.get('key') : null;
  } catch {
    return null;
  }
}

async function currentAvatarUrl(env: Env, profileId: string) {
  try {
    const row = await env.DB.prepare('select avatar_url from recent_users where id = ? limit 1')
      .bind(profileId)
      .first<{ avatar_url?: string | null }>();
    return row?.avatar_url?.trim() ?? '';
  } catch {
    return '';
  }
}

async function storeAvatarUrl(env: Env, profileId: string, avatarUrl: string) {
  try {
    await env.DB.batch([
      env.DB.prepare(
        'update recent_users set avatar_url = ?, updated_at = datetime("now") where id = ?',
      ).bind(avatarUrl, profileId),
      env.DB.prepare(
        'update talk_posts set avatar_url = ? where profile_id = ?',
      ).bind(avatarUrl, profileId),
    ]);
  } catch {
    // A new profile may not have synchronized its database row yet.
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'key가 필요해요.' }, { status: 400 });

  const object = await env.IMAGES.get(key);
  if (!object) return Response.json({ error: '이미지를 찾을 수 없어요.' }, { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  if (!profileId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const formData = await request.formData();
  const validated = await validateImageFile(formData.get('image'), 3 * 1024 * 1024);
  if ('error' in validated) return Response.json({ error: validated.error }, { status: 400 });

  const previousKey = keyFromAvatarUrl(await currentAvatarUrl(env, profileId));
  const key = `profiles/${profileId}/${crypto.randomUUID()}.${validated.image.extension}`;
  const avatarUrl = `/api/profile-image?key=${encodeURIComponent(key)}`;

  await env.IMAGES.put(key, validated.image.bytes, {
    httpMetadata: { contentType: validated.image.contentType },
  });

  await storeAvatarUrl(env, profileId, avatarUrl);

  if (previousKey?.startsWith(`profiles/${profileId}/`) && previousKey !== key) {
    await env.IMAGES.delete(previousKey);
  }

  return Response.json({ avatar_url: avatarUrl });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const avatarUrl = url.searchParams.get('avatar_url')?.trim() ?? '';

  if (!profileId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const key = keyFromAvatarUrl(avatarUrl);
  if (key?.startsWith(`profiles/${profileId}/`)) await env.IMAGES.delete(key);

  await storeAvatarUrl(env, profileId, '');
  return Response.json({ avatar_url: '' });
};
