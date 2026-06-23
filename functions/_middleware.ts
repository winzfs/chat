import { authenticatedProfileId, jsonError } from './_shared/auth';

type Env = { AUTH_SECRET?: string };

const publicGetPaths = new Set([
  '/api/talk-posts',
  '/api/profile-lookup',
  '/api/profile-image',
  '/api/chat-images',
]);

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

  if (pathname === '/api/profile-sync' && request.method === 'POST') {
    const body = await request.clone().json().catch(() => ({})) as { profile_id?: string };
    const declaredId = body.profile_id?.trim() ?? '';
    if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
    if (declaredId !== profileId) return jsonError('다른 사용자 프로필을 수정할 수 없어요.', 403);
  }

  if (pathname === '/api/recent-users') {
    const declaredId = request.method === 'GET'
      ? url.searchParams.get('profile_id')?.trim() ?? ''
      : ((await request.clone().json().catch(() => ({}))) as { profile_id?: string }).profile_id?.trim() ?? '';
    if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
    if (declaredId !== profileId) return jsonError('다른 사용자로 접속 상태를 갱신할 수 없어요.', 403);
  }

  if (pathname === '/api/talk-posts' && request.method !== 'GET') {
    const bodyId = request.method === 'POST'
      ? ((await request.clone().json().catch(() => ({}))) as { profile_id?: string }).profile_id?.trim() ?? ''
      : url.searchParams.get('profile_id')?.trim() ?? '';
    if (!bodyId) return jsonError('profile_id가 필요해요.', 400);
    if (bodyId !== profileId) return jsonError('다른 사용자 이름으로 토크를 변경할 수 없어요.', 403);
  }

  const headers = new Headers(request.headers);
  headers.set('x-auth-profile-id', profileId);
  headers.set('x-profile-id', profileId);

  return next(new Request(request, { headers }));
};
