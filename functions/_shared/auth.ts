export type EnvWithDb = { DB: D1Database };
export type EnvWithAdmin = { ADMIN_PROFILE_IDS?: string };

export type ChatRoomAuthRow = {
  id: string;
  direct_key?: string | null;
  participant_a_id?: string | null;
  participant_b_id?: string | null;
  room_owner_profile_id?: string | null;
};

export function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
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

export function isAdminRequest(env: EnvWithAdmin, request: Request) {
  return isAdminProfile(env, profileIdFromRequest(request, ['admin_profile_id', 'profile_id']));
}

export async function chatRoomAuthRow(env: EnvWithDb, roomId: string) {
  return env.DB.prepare(
    `select id, direct_key, participant_a_id, participant_b_id, room_owner_profile_id
     from chat_rooms
     where id = ?
     limit 1`,
  ).bind(roomId).first<ChatRoomAuthRow>();
}

export function isProfileInChatRoom(room: ChatRoomAuthRow | null | undefined, profileId: string) {
  if (!room || !profileId) return false;

  if (!room.direct_key) return true;

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
    return jsonError('가입한 사용자만 접근할 수 있어요.', 401);
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
