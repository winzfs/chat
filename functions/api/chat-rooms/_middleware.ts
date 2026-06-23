import { jsonError } from '../../_shared/auth';

export const onRequest: PagesFunction = async ({ request, next }) => {
  const authenticatedId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  if (!authenticatedId) return jsonError('로그인이 필요해요.', 401);

  const declaredId = request.method === 'GET'
    ? new URL(request.url).searchParams.get('profile_id')?.trim() ?? ''
    : String(((await request.clone().json().catch(() => ({}))) as { profile_id?: unknown }).profile_id ?? '').trim();

  if (!declaredId) return jsonError('profile_id가 필요해요.', 400);
  if (declaredId !== authenticatedId) return jsonError('다른 사용자 권한으로 요청할 수 없어요.', 403);

  return next();
};
