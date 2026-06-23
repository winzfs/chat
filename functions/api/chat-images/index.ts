import { requireChatRoomParticipant } from '../../_shared/auth';
import { validateImageFile } from '../../_shared/images';

type Env = {
  DB: D1Database;
  IMAGES: R2Bucket;
};

async function ensureChatImageColumns(env: Env) {
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

async function hasRecentUser(env: Env, profileId: string) {
  const user = await env.DB.prepare('select id from recent_users where id = ? limit 1').bind(profileId).first();
  return Boolean(user);
}

async function isBlockedRoom(env: Env, roomId: string) {
  const room = await env.DB.prepare(
    'select participant_a_id, participant_b_id from chat_rooms where id = ? limit 1',
  ).bind(roomId).first<{ participant_a_id?: string | null; participant_b_id?: string | null }>();

  const first = room?.participant_a_id?.trim() ?? '';
  const second = room?.participant_b_id?.trim() ?? '';
  if (!first || !second) return false;

  const blocked = await env.DB.prepare(
    'select 1 as value from user_blocks where (blocker_id = ? and blocked_id = ?) or (blocker_id = ? and blocked_id = ?) limit 1',
  ).bind(first, second, second, first).first<{ value: number }>();

  return Boolean(blocked?.value);
}

async function senderNickname(env: Env, profileId: string) {
  const user = await env.DB.prepare('select nickname from recent_users where id = ? limit 1')
    .bind(profileId)
    .first<{ nickname?: string | null }>();
  return user?.nickname?.trim().slice(0, 20) || '익명';
}

async function unhideRoom(env: Env, roomId: string, profileId: string) {
  await env.DB.prepare(
    `update chat_room_exits
     set is_hidden = 0, updated_at = datetime('now')
     where room_id = ? and profile_id = ?`,
  ).bind(roomId, profileId).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const key = new URL(request.url).searchParams.get('key');

  if (!key) {
    return Response.json({ error: 'key가 필요해요.' }, { status: 400 });
  }

  const object = await env.IMAGES.get(key);
  if (!object) {
    return Response.json({ error: '이미지를 찾을 수 없어요.' }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatImageColumns(env);

  const formData = await request.formData();
  const roomId = String(formData.get('room_id') ?? '').trim();
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const authError = await requireChatRoomParticipant(env, roomId, profileId);

  if (authError) return authError;
  if (!(await hasRecentUser(env, profileId))) {
    return Response.json({ error: '프로필 동기화 후 이미지를 보낼 수 있어요.' }, { status: 403 });
  }
  if (await isBlockedRoom(env, roomId)) {
    return Response.json({ error: '차단 관계에서는 이미지를 보낼 수 없어요.' }, { status: 403 });
  }

  const validated = await validateImageFile(formData.get('image'), 5 * 1024 * 1024);
  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  await unhideRoom(env, roomId, profileId);

  const nickname = await senderNickname(env, profileId);
  const key = `chat/${roomId}/${profileId}/${crypto.randomUUID()}.${validated.image.extension}`;
  const imageUrl = `/api/chat-images?key=${encodeURIComponent(key)}`;

  await env.IMAGES.put(key, validated.image.bytes, {
    httpMetadata: { contentType: validated.image.contentType },
  });

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, sender_profile_id, message_type, image_key, image_url) values (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, roomId, nickname, profileId, 'image', key, imageUrl).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind('사진을 보냈어요.', roomId).run();

  const message = await env.DB.prepare(
    'select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at from chat_messages where id = ?',
  ).bind(id).first();

  return Response.json({ message }, { status: 201 });
};
