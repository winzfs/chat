import { requireChatRoomParticipant } from '../../_shared/auth';

type Env = { DB: D1Database };

type LeaveBody = {
  room_id?: string;
};

async function ensureChatRoomExitTable(env: Env) {
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

  try {
    await env.DB.prepare('alter table chat_messages add column sender_profile_id text').run();
  } catch {
    // Legacy databases may already contain the column.
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatRoomExitTable(env);

  const body = await request.json() as LeaveBody;
  const roomId = body.room_id?.trim() ?? '';
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const authError = await requireChatRoomParticipant(env, roomId, profileId);

  if (authError) return authError;

  const profile = await env.DB.prepare('select nickname from recent_users where id = ? limit 1')
    .bind(profileId)
    .first<{ nickname?: string | null }>();
  const nickname = profile?.nickname?.trim().slice(0, 20) || '상대방';
  const message = `${nickname}님이 나갔습니다.`;
  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, sender_profile_id, message_type, body, created_at) values (?, ?, ?, ?, ?, ?, datetime("now"))',
  ).bind(id, roomId, 'system', 'system', 'text', message).run();

  const systemMessage = await env.DB.prepare('select created_at from chat_messages where id = ?').bind(id).first<{ created_at: string }>();
  const exitedAt = systemMessage?.created_at ?? new Date().toISOString();

  await env.DB.prepare(
    `insert into chat_room_exits (room_id, profile_id, exited_at, is_hidden, updated_at)
     values (?, ?, ?, 1, datetime('now'))
     on conflict(room_id, profile_id) do update set
       exited_at = excluded.exited_at,
       is_hidden = 1,
       updated_at = datetime('now')`,
  ).bind(roomId, profileId, exitedAt).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind(message, roomId).run();

  return Response.json({ ok: true });
};
