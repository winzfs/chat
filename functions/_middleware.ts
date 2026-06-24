import { authenticatedProfileId, jsonError } from './_shared/auth';

type Env = { AUTH_SECRET?: string; DB: D1Database };

const publicGetPaths = new Set([
  '/api/talk-posts',
  '/api/profile-lookup',
  '/api/profile-image',
  '/api/chat-images',
]);

function bodyProfileId(body: unknown) {
  return typeof body === 'object' && body !== null && 'profile_id' in body
    ? String((body as { profile_id?: unknown }).profile_id ?? '').trim()
    : '';
}

async function isRevokedProfile(env: Env, profileId: string) {
  try {
    const row = await env.DB.prepare(
      'select profile_id from revoked_profiles where profile_id = ? limit 1',
    ).bind(profileId).first();
    return Boolean(row);
  } catch {
    // The migration may not be applied in local/legacy environments yet.
    return false;
  }
}

export const onRequest: PagesFunction<Env> = async ({ env, request, next }) => {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (!pathname.startsWith('/api/')) return next();
  if (request.method === 'OPTIONS') return next();
  if (pathname === '/api/auth/session' && request.method === 'POST') return next();
  if (request.method === 'GET' && publicGetPaths.has(pathname)) return next();

  const profileId = await authenticatedProfileId(env, request);
  if (!profileId) {
    return jsonError(env.AUTH_SECRET ? '로그인이 필요해요.' : '서버 AUTH_SECRET 설정이 필요해요.', env.AUTH_SECRET ? 401 : 503);
  }

  if (await isRevokedProfile(env, profileId)) {
    return jsonError('탈퇴 처리된 계정이에요. 앱을 다시 시작해주세요.', 401);
  }

  if (pathname === '/api/profile-sync' && request.method === 'POST') {
    const declaredId = bodyProfileId(await request.clone().json().catch(() => ({})));
    if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
    if (declaredId !== profileId) return jsonError('다른 사용자 프로필을 수정할 수 없어요.', 403);
  }

  if (pathname === '/api/recent-users') {
    const declaredId = request.method === 'GET'
      ? url.searchParams.get('profile_id')?.trim() ?? ''
      : bodyProfileId(await request.clone().json().catch(() => ({})));
    if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
    if (declaredId !== profileId) return jsonError('다른 사용자로 접속 상태를 갱신할 수 없어요.', 403);
  }

  if (pathname === '/api/chat-rooms') {
    const declaredId = request.method === 'GET'
      ? url.searchParams.get('profile_id')?.trim() ?? ''
      : request.method === 'POST'
        ? bodyProfileId(await request.clone().json().catch(() => ({})))
        : profileId;
    if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
    if (declaredId !== profileId) return jsonError('다른 사용자 채팅방에 접근할 수 없어요.', 403);
  }

  if (pathname === '/api/talk-posts' && request.method !== 'GET') {
    const bodyId = request.method === 'POST'
      ? bodyProfileId(await request.clone().json().catch(() => ({})))
      : url.searchParams.get('profile_id')?.trim() ?? '';
    if (!bodyId) return jsonError('profile_id가 필요해요.', 400);
    if (bodyId !== profileId) return jsonError('다른 사용자 이름으로 토크를 변경할 수 없어요.', 403);
  }

  const headers = new Headers(request.headers);
  headers.set('x-auth-profile-id', profileId);
  headers.set('x-profile-id', profileId);

  return next(new Request(request, { headers }));
};
