export type EnvWithDb = { DB: D1Database };
export type EnvWithAdmin = { ADMIN_PROFILE_IDS?: string };
export type EnvWithAuth = { AUTH_SECRET?: string };
export type AuthEnv = EnvWithAuth & Partial<EnvWithDb> & Partial<EnvWithAdmin>;

export type ChatRoomAuthRow = {
  id: string;
  direct_key?: string | null;
  participant_a_id?: string | null;
  participant_b_id?: string | null;
  room_owner_profile_id?: string | null;
};

type SessionPayload = {
  sub: string;
  iat: number;
  v: 1;
};

export type AuthResult =
  | { profileId: string }
  | { response: Response };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function authSecret(env: EnvWithAuth) {
  const secret = env.AUTH_SECRET?.trim() ?? '';
  return secret.length >= 32 ? secret : '';
}

async function authKey(env: EnvWithAuth) {
  const secret = authSecret(env);
  if (!secret) return null;

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function issueAuthSession(env: EnvWithAuth, profileId = crypto.randomUUID()) {
  const key = await authKey(env);
  if (!key) return null;

  const payload: SessionPayload = {
    sub: profileId,
    iat: Date.now(),
    v: 1,
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));

  return {
    profile_id: profileId,
    token: `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`,
  };
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  return authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
}

export async function authenticatedProfileId(env: EnvWithAuth, request: Request) {
  const token = bearerToken(request);
  const key = await authKey(env);
  if (!token || !key) return '';

  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return '';

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return '';

    const payload = JSON.parse(decoder.decode(base64UrlToBytes(encodedPayload))) as Partial<SessionPayload>;
    const now = Date.now();
    const validIssuedAt = typeof payload.iat === 'number'
      && payload.iat <= now + CLOCK_SKEW_MS
      && payload.iat >= now - SESSION_MAX_AGE_MS;

    return payload.v === 1
      && validIssuedAt
      && typeof payload.sub === 'string'
      && payload.sub.trim()
      ? payload.sub.trim()
      : '';
  } catch {
    return '';
  }
}

export async function requireAuthenticatedProfile(env: EnvWithAuth, request: Request): Promise<AuthResult> {
  if (!authSecret(env)) {
    return { response: jsonError('서버 인증 설정이 필요해요.', 503) };
  }

  const profileId = await authenticatedProfileId(env, request);
  if (!profileId) {
    return { response: jsonError('로그인이 필요해요.', 401) };
  }

  return { profileId };
}

export function profileIdFromRequest(request: Request, queryKeys = ['profile_id']) {
  const url = new URL(request.url);
  const headerProfileId = request.headers.get('x-profile-id')?.trim();

  if (headerProfileId) return headerProfileId;

  for (const key of queryKeys) {
    const value = url.searchParams.get(key)?.trim();
    if (value) return value;
  }

  return '';
}

export function bodyProfileId(body: Record<string, unknown>, key = 'profile_id') {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function declaredProfileMatchesRequest(request: Request, declaredProfileId: string, queryKeys = ['profile_id']) {
  const requesterId = profileIdFromRequest(request, queryKeys);
  return Boolean(requesterId && requesterId === declaredProfileId);
}

export function adminProfileIds(env: EnvWithAdmin) {
  return (env.ADMIN_PROFILE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdminProfile(env: EnvWithAdmin, profileId: string) {
  return Boolean(profileId && adminProfileIds(env).includes(profileId));
}

export async function requireAdminProfile(env: EnvWithAuth & EnvWithAdmin, request: Request): Promise<AuthResult> {
  const auth = await requireAuthenticatedProfile(env, request);
  if ('response' in auth) return auth;

  if (!isAdminProfile(env, auth.profileId)) {
    return { response: jsonError('운영자만 접근할 수 있어요.', 403) };
  }

  return auth;
}

export async function ensureChatRoomAuthColumns(env: EnvWithDb) {
  const columns = [
    'alter table chat_rooms add column direct_key text',
    'alter table chat_rooms add column participant_a_id text',
    'alter table chat_rooms add column participant_b_id text',
    'alter table chat_rooms add column room_owner_profile_id text',
  ];

  for (const query of columns) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // Legacy databases may already contain the column.
    }
  }
}

export async function chatRoomAuthRow(env: EnvWithDb, roomId: string) {
  await ensureChatRoomAuthColumns(env);

  return env.DB.prepare(
    `select id, direct_key, participant_a_id, participant_b_id, room_owner_profile_id
     from chat_rooms
     where id = ?
     limit 1`,
  ).bind(roomId).first<ChatRoomAuthRow>();
}

export function isProfileInChatRoom(room: ChatRoomAuthRow | null | undefined, profileId: string) {
  if (!room || !profileId) return false;

  return room.participant_a_id === profileId
    || room.participant_b_id === profileId
    || room.room_owner_profile_id === profileId;
}

export async function isChatRoomParticipant(env: EnvWithDb, roomId: string, profileId: string) {
  const room = await chatRoomAuthRow(env, roomId);
  return isProfileInChatRoom(room, profileId);
}

export async function requireChatRoomParticipant(env: EnvWithDb, roomId: string, profileId: string) {
  if (!profileId) {
    return jsonError('로그인이 필요해요.', 401);
  }

  if (!roomId) {
    return jsonError('room_id가 필요해요.', 400);
  }

  const room = await chatRoomAuthRow(env, roomId);

  if (!room) {
    return jsonError('채팅방을 찾을 수 없어요.', 404);
  }

  if (!isProfileInChatRoom(room, profileId)) {
    return jsonError('이 채팅방에 접근할 수 없어요.', 403);
  }

  return null;
}
