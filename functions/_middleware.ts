import { authenticatedProfileId, jsonError } from './_shared/auth';

type Env = { AUTH_SECRET?: string; ALLOWED_ORIGINS?: string; DB: D1Database };

class PolicyLookupError extends Error {
  constructor() {
    super('Authorization policy lookup failed');
    this.name = 'PolicyLookupError';
  }
}

const publicGetPaths = new Set([
  '/api/talk-posts',
  '/api/profile-lookup',
  '/api/profile-image',
  '/api/chat-images',
]);

const crossOriginAssetPaths = new Set([
  '/api/profile-image',
  '/api/chat-images',
]);

const nativeAppOrigins = new Set([
  'https://localhost',
  'capacitor://localhost',
]);

function bodyProfileId(body: unknown) {
  return typeof body === 'object' && body !== null && 'profile_id' in body
    ? String((body as { profile_id?: unknown }).profile_id ?? '').trim()
    : '';
}

function requestId(request: Request) {
  const supplied = request.headers.get('x-request-id')?.trim() ?? '';
  return /^[a-zA-Z0-9._:-]{8,96}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function appendVary(headers: Headers, value: string) {
  const current = headers.get('vary');
  if (!current) {
    headers.set('vary', value);
    return;
  }

  const values = current.split(',').map((item) => item.trim().toLowerCase());
  if (!values.includes(value.toLowerCase())) headers.set('vary', `${current}, ${value}`);
}

function configuredOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveCorsOrigin(env: Env, request: Request) {
  const origin = request.headers.get('origin')?.trim();
  if (!origin) return '';

  const allowed = new Set([
    new URL(request.url).origin,
    ...nativeAppOrigins,
    ...configuredOrigins(env),
  ]);
  return allowed.has(origin) ? origin : null;
}

function withApiHeaders(response: Response, id: string, durationMs: number, pathname: string, corsOrigin: string | null) {
  const headers = new Headers(response.headers);
  headers.set('x-request-id', id);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'same-origin');
  headers.set('cross-origin-resource-policy', crossOriginAssetPaths.has(pathname) ? 'cross-origin' : 'same-origin');
  headers.set('server-timing', `app;dur=${durationMs}`);
  headers.set('access-control-expose-headers', 'x-request-id, server-timing');
  if (corsOrigin) {
    headers.set('access-control-allow-origin', corsOrigin);
    headers.set('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    headers.set('access-control-allow-headers', 'authorization, content-type, x-request-id');
    headers.set('access-control-max-age', '86400');
    appendVary(headers, 'Origin');
  }
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  appendVary(headers, 'Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function logRequest(details: {
  requestId: string;
  method: string;
  pathname: string;
  status: number;
  durationMs: number;
  authState: string;
}) {
  const shouldLog = details.status >= 400 || details.method !== 'GET' || details.durationMs >= 1000;
  if (!shouldLog) return;

  const payload = JSON.stringify({
    event: 'api.request',
    request_id: details.requestId,
    method: details.method,
    pathname: details.pathname,
    status: details.status,
    duration_ms: details.durationMs,
    auth_state: details.authState,
  });

  if (details.status >= 500) console.error(payload);
  else if (details.status >= 400) console.warn(payload);
  else console.log(payload);
}

async function isRevokedProfile(env: Env, profileId: string) {
  try {
    const row = await env.DB.prepare(
      'select profile_id from revoked_profiles where profile_id = ? limit 1',
    ).bind(profileId).first();
    return Boolean(row);
  } catch {
    throw new PolicyLookupError();
  }
}

async function activeSuspension(env: Env, profileId: string) {
  try {
    return await env.DB.prepare(
      `select reason, suspended_until
       from user_suspensions
       where profile_id = ?
         and (suspended_until is null or datetime(suspended_until) > datetime('now'))
       limit 1`,
    ).bind(profileId).first<{ reason?: string | null; suspended_until?: string | null }>();
  } catch {
    throw new PolicyLookupError();
  }
}

export const onRequest: PagesFunction<Env> = async ({ env, request, next }) => {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (!pathname.startsWith('/api/')) return next();

  const id = requestId(request);
  const startedAt = Date.now();
  const corsOrigin = resolveCorsOrigin(env, request);
  let authState = 'not-checked';

  const finish = (response: Response) => {
    const durationMs = Date.now() - startedAt;
    logRequest({
      requestId: id,
      method: request.method,
      pathname,
      status: response.status,
      durationMs,
      authState,
    });
    return withApiHeaders(response, id, durationMs, pathname, corsOrigin);
  };

  try {
    if (corsOrigin === null) {
      authState = 'cors-rejected';
      return finish(jsonError('허용되지 않은 앱 출처에서 보낸 요청이에요.', 403));
    }
    if (request.method === 'OPTIONS') {
      authState = 'preflight';
      return finish(new Response(null, { status: 204 }));
    }
    if (pathname === '/api/auth/session' && request.method === 'POST') {
      authState = 'public';
      return finish(await next());
    }
    if (request.method === 'GET' && publicGetPaths.has(pathname)) {
      authState = 'public';
      return finish(await next());
    }

    const profileId = await authenticatedProfileId(env, request);
    if (!profileId) {
      authState = env.AUTH_SECRET ? 'missing' : 'server-misconfigured';
      return finish(jsonError(env.AUTH_SECRET ? '로그인이 필요해요.' : '서버 AUTH_SECRET 설정이 필요해요.', env.AUTH_SECRET ? 401 : 503));
    }
    authState = 'authenticated';

    if (await isRevokedProfile(env, profileId)) {
      authState = 'revoked';
      return finish(jsonError('탈퇴 처리된 계정이에요. 앱을 다시 시작해주세요.', 401));
    }

    const suspension = await activeSuspension(env, profileId);
    if (suspension) {
      authState = 'suspended';
      const until = suspension.suspended_until ? ` 정지 종료: ${suspension.suspended_until}` : ' 무기한 정지 상태입니다.';
      return finish(jsonError(`운영 정책 위반으로 이용이 제한됐어요.${until}`, 403));
    }

    if (pathname === '/api/profile-sync' && request.method === 'POST') {
      const declaredId = bodyProfileId(await request.clone().json().catch(() => ({})));
      if (!declaredId) return finish(jsonError('profile_id가 필요해요.', 400));
      if (declaredId !== profileId) return finish(jsonError('다른 사용자 프로필을 수정할 수 없어요.', 403));
    }

    if (pathname === '/api/recent-users') {
      const declaredId = request.method === 'GET'
        ? url.searchParams.get('profile_id')?.trim() ?? ''
        : bodyProfileId(await request.clone().json().catch(() => ({})));
      if (!declaredId) return finish(jsonError('profile_id가 필요해요.', 400));
      if (declaredId !== profileId) return finish(jsonError('다른 사용자로 접속 상태를 갱신할 수 없어요.', 403));
    }

    if (pathname === '/api/chat-rooms') {
      const declaredId = request.method === 'GET'
        ? url.searchParams.get('profile_id')?.trim() ?? ''
        : request.method === 'POST'
          ? bodyProfileId(await request.clone().json().catch(() => ({})))
          : profileId;
      if (!declaredId) return finish(jsonError('profile_id가 필요해요.', 400));
      if (declaredId !== profileId) return finish(jsonError('다른 사용자 채팅방에 접근할 수 없어요.', 403));
    }

    if (pathname === '/api/talk-posts' && request.method !== 'GET') {
      const bodyId = request.method === 'POST'
        ? bodyProfileId(await request.clone().json().catch(() => ({})))
        : url.searchParams.get('profile_id')?.trim() ?? '';
      if (!bodyId) return finish(jsonError('profile_id가 필요해요.', 400));
      if (bodyId !== profileId) return finish(jsonError('다른 사용자 이름으로 토크를 변경할 수 없어요.', 403));
    }

    const headers = new Headers(request.headers);
    headers.set('x-auth-profile-id', profileId);
    headers.set('x-profile-id', profileId);
    headers.set('x-request-id', id);

    return finish(await next(new Request(request, { headers })));
  } catch (error) {
    const policyUnavailable = error instanceof PolicyLookupError;
    console.error(JSON.stringify({
      event: 'api.unhandled_error',
      request_id: id,
      method: request.method,
      pathname,
      error_name: error instanceof Error ? error.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : 'Unknown server error',
    }));
    authState = policyUnavailable ? 'policy-unavailable' : `${authState}:error`;
    return finish(jsonError(
      policyUnavailable
        ? '서버 권한 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.'
        : '일시적인 서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
      policyUnavailable ? 503 : 500,
    ));
  }
};
