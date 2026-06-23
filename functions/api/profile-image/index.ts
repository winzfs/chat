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

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'key가 필요해요.' }, { status: 400 });

  const object = await env.IMAGES.get(key);
  if (!object) return Response.json({ error: '이미지를 찾을 수 없어요.' }, { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
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

  const key = `profiles/${profileId}/${crypto.randomUUID()}.${validated.image.extension}`;
  const avatarUrl = `/api/profile-image?key=${encodeURIComponent(key)}`;

  await env.IMAGES.put(key, validated.image.bytes, {
    httpMetadata: { contentType: validated.image.contentType },
  });

  return Response.json({ avatar_url: avatarUrl });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const avatarUrl = url.searchParams.get('avatar_url')?.trim() ?? '';

  if (!profileId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });

  const key = keyFromAvatarUrl(avatarUrl);
  if (key?.startsWith(`profiles/${profileId}/`)) await env.IMAGES.delete(key);

  try {
    await env.DB.prepare('update recent_users set avatar_url = ?, updated_at = datetime("now") where id = ?').bind('', profileId).run();
    await env.DB.prepare('update talk_posts set avatar_url = ? where profile_id = ?').bind('', profileId).run();
  } catch {
    // Fresh databases may not have synced profile rows yet.
  }

  return Response.json({ avatar_url: '' });
};
