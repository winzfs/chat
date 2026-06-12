type Env = { DB: D1Database };

type MessageBody = {
  room_id?: string;
  body?: string;
  sender_nickname?: string;
  profile_id?: string;
};

type ChatRoomAccessRow = {
  id: string;
  participant_a_id?: string | null;
  participant_b_id?: string | null;
  room_owner_profile_id?: string | null;
};

function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

function isProfileInChatRoom(room: ChatRoomAccessRow | null | undefined, profileId: string) {
  if (!room || !profileId) return false;

  return room.participant_a_id === profileId
    || room.participant_b_id === profileId
    || room.room_owner_profile_id === profileId;
}

async function requireChatRoomParticipant(env: Env, roomId: string, profileId: string) {
  if (!profileId) {
    return jsonError('가입한 사용자만 접근할 수 있어요.', 401);
  }

  if (!roomId) {
    return jsonError('room_id가 필요해요.', 400);
  }

  const room = await env.DB.prepare(
    `select id, participant_a_id, participant_b_id, room_owner_profile_id
     from chat_rooms
     where id = ?
     limit 1`,
  ).bind(roomId).first<ChatRoomAccessRow>();

  if (!room) {
    return jsonError('채팅방을 찾을 수 없어요.', 404);
  }

  if (!isProfileInChatRoom(room, profileId)) {
    return jsonError('이 채팅방에 접근할 수 없어요.', 403);
  }

  return null;
}

async function ensureChatMessageColumns(env: Env) {
  try {
    await env.DB.prepare('alter table chat_messages add column sender_profile_id text').run();
  } catch {
    // column already exists
  }

  try {
    await env.DB.prepare('alter table chat_rooms add column updated_at text').run();
  } catch {
    // column already exists
  }

  await env.DB.prepare(
    `create table if not exists chat_room_reads (
      room_id text not null,
      profile_id text not null,
      last_read_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      primary key (room_id, profile_id)
    )`,
  ).run();

  await env.DB.prepare(
    `create table if not exists chat_room_exits (
      room_id text not null,
      profile_id text not null,
      exited_at text not null default (datetime('now')),
      is_hidden integer not null default 1,
      updated_at text not null default (datetime('now')),
      primary key (room_id, profile_id)
    )`,
  ).run();
}

async function markRoomAsRead(env: Env, roomId: string, profileId: string) {
  if (!profileId) return;

  await env.DB.prepare(
    `insert into chat_room_reads (room_id, profile_id, last_read_at, updated_at)
     values (?, ?, datetime('now'), datetime('now'))
     on conflict(room_id, profile_id) do update set
       last_read_at = datetime('now'),
       updated_at = datetime('now')`,
  ).bind(roomId, profileId).run();
}

async function unhideRoom(env: Env, roomId: string, profileId: string) {
  if (!profileId) return;

  await env.DB.prepare(
    `update chat_room_exits
     set is_hidden = 0, updated_at = datetime('now')
     where room_id = ? and profile_id = ?`,
  ).bind(roomId, profileId).run();
}

async function unhideRoomParticipants(env: Env, roomId: string) {
  const room = await env.DB.prepare(
    'select participant_a_id, participant_b_id from chat_rooms where id = ? limit 1',
  ).bind(roomId).first<{ participant_a_id?: string | null; participant_b_id?: string | null }>();

  for (const profileId of [room?.participant_a_id, room?.participant_b_id]) {
    if (profileId) await unhideRoom(env, roomId, profileId);
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatMessageColumns(env);

  const url = new URL(request.url);
  const roomId = url.searchParams.get('room_id')?.trim() ?? '';
  const profileId = url.searchParams.get('profile_id')?.trim() ?? '';
  const authError = await requireChatRoomParticipant(env, roomId, profileId);

  if (authError) return authError;

  const { results } = await env.DB.prepare(
    `select m.id, m.room_id, m.sender_nickname, m.sender_profile_id, m.message_type, m.body, m.image_key, m.image_url, m.created_at
     from chat_messages m
     left join chat_room_exits ex on ex.room_id = m.room_id and ex.profile_id = ?
     where m.room_id = ?
       and (ex.exited_at is null or datetime(m.created_at) > datetime(ex.exited_at))
     order by m.created_at asc
     limit 100`,
  ).bind(profileId, roomId).all();

  await markRoomAsRead(env, roomId, profileId);

  return Response.json({ messages: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatMessageColumns(env);

  const data = await request.json() as MessageBody;
  const roomId = data.room_id?.trim() ?? '';
  const body = data.body?.trim() ?? '';
  const senderNickname = data.sender_nickname?.trim().slice(0, 20) || '익명';
  const profileId = data.profile_id?.trim() ?? '';
  const authError = await requireChatRoomParticipant(env, roomId, profileId);

  if (authError) return authError;

  if (body.length < 1 || body.length > 500) {
    return Response.json({ error: '메시지는 1자 이상 500자 이하로 입력해야 해요.' }, { status: 400 });
  }

  await unhideRoomParticipants(env, roomId);

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, sender_profile_id, message_type, body) values (?, ?, ?, ?, ?, ?)',
  ).bind(id, roomId, senderNickname, profileId, 'text', body).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind(body, roomId).run();

  await markRoomAsRead(env, roomId, profileId);

  const message = await env.DB.prepare(
    'select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at from chat_messages where id = ?',
  ).bind(id).first();

  return Response.json({ message }, { status: 201 });
};
