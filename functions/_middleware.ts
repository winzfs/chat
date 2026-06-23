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

  const headers = new Headers(request.headers);
  headers.set('x-auth-profile-id', profileId);
  headers.set('x-profile-id', profileId);

  return next(new Request(request, { headers }));
};
