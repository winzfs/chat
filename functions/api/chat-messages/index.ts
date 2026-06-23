import { requireChatRoomParticipant } from '../../_shared/auth';

type Env = { DB: D1Database };

type MessageBody = {
  room_id?: string;
  body?: string;
};

async function ensureChatMessageColumns(env: Env) {
  for (const query of [
    'alter table chat_messages add column sender_profile_id text',
    'alter table chat_rooms add column updated_at text',
  ]) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // Legacy databases may already contain the column.
    }
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

  await env.DB.prepare(
    `create table if not exists user_blocks (
      blocker_id text not null,
      blocked_id text not null,
      blocked_nickname text,
      created_at text not null default (datetime('now')),
      primary key (blocker_id, blocked_id)
    )`,
  ).run();
}

async function markRoomAsRead(env: Env, roomId: string, profileId: string) {
  await env.DB.prepare(
    `insert into chat_room_reads (room_id, profile_id, last_read_at, updated_at)
     values (?, ?, datetime('now'), datetime('now'))
     on conflict(room_id, profile_id) do update set
       last_read_at = datetime('now'),
       updated_at = datetime('now')`,
  ).bind(roomId, profileId).run();
}

async function unhideRoomForSender(env: Env, roomId: string, profileId: string) {
  await env.DB.prepare(
    `update chat_room_exits
     set is_hidden = 0, updated_at = datetime('now')
     where room_id = ? and profile_id = ?`,
  ).bind(roomId, profileId).run();
}

async function roomHasBlock(env: Env, roomId: string) {
  const room = await env.DB.prepare(
    'select participant_a_id, participant_b_id from chat_rooms where id = ? limit 1',
  ).bind(roomId).first<{ participant_a_id?: string | null; participant_b_id?: string | null }>();

  if (!room?.participant_a_id || !room.participant_b_id) return false;

  const block = await env.DB.prepare(
    `select 1 as blocked from user_blocks
     where (blocker_id = ? and blocked_id = ?)
        or (blocker_id = ? and blocked_id = ?)
     limit 1`,
  ).bind(room.participant_a_id, room.participant_b_id, room.participant_b_id, room.participant_a_id).first();

  return Boolean(block);
}

async function senderNickname(env: Env, profileId: string) {
  const profile = await env.DB.prepare('select nickname from recent_users where id = ? limit 1')
    .bind(profileId)
    .first<{ nickname?: string | null }>();
  return profile?.nickname?.trim().slice(0, 20) || '익명';
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatMessageColumns(env);

  const url = new URL(request.url);
  const roomId = url.searchParams.get('room_id')?.trim() ?? '';
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const authError = await requireChatRoomParticipant(env, roomId, profileId);

  if (authError) return authError;

  const { results } = await env.DB.prepare(
    `select * from (
       select m.id, m.room_id, m.sender_nickname, m.sender_profile_id, m.message_type, m.body, m.image_key, m.image_url, m.created_at
       from chat_messages m
       left join chat_room_exits ex on ex.room_id = m.room_id and ex.profile_id = ?
       where m.room_id = ?
         and (ex.exited_at is null or datetime(m.created_at) > datetime(ex.exited_at))
       order by m.created_at desc
       limit 100
     ) recent_messages
     order by created_at asc`,
  ).bind(profileId, roomId).all();

  await markRoomAsRead(env, roomId, profileId);
  return Response.json({ messages: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatMessageColumns(env);

  const data = await request.json() as MessageBody;
  const roomId = data.room_id?.trim() ?? '';
  const body = data.body?.trim() ?? '';
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const authError = await requireChatRoomParticipant(env, roomId, profileId);

  if (authError) return authError;
  if (await roomHasBlock(env, roomId)) {
    return Response.json({ error: '차단 관계에서는 메시지를 보낼 수 없어요.' }, { status: 403 });
  }
  if (body.length < 1 || body.length > 500) {
    return Response.json({ error: '메시지는 1자 이상 500자 이하로 입력해야 해요.' }, { status: 400 });
  }

  const nickname = await senderNickname(env, profileId);
  await unhideRoomForSender(env, roomId, profileId);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, sender_profile_id, message_type, body) values (?, ?, ?, ?, ?, ?)',
  ).bind(id, roomId, nickname, profileId, 'text', body).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind(body, roomId).run();

  await markRoomAsRead(env, roomId, profileId);

  const message = await env.DB.prepare(
    'select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at from chat_messages where id = ?',
  ).bind(id).first();

  return Response.json({ message }, { status: 201 });
};
