type Env = { DB: D1Database };

type MessageBody = {
  room_id?: string;
  body?: string;
  sender_nickname?: string;
  profile_id?: string;
};

async function ensureChatMessageColumns(env: Env) {
  try {
    await env.DB.prepare('alter table chat_messages add column sender_profile_id text').run();
  } catch {
    // column already exists
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatMessageColumns(env);

  const url = new URL(request.url);
  const roomId = url.searchParams.get('room_id');

  if (!roomId) {
    return Response.json({ error: 'room_id가 필요해요.' }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    'select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at from chat_messages where room_id = ? order by created_at asc limit 100',
  ).bind(roomId).all();

  return Response.json({ messages: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatMessageColumns(env);

  const data = await request.json() as MessageBody;
  const roomId = data.room_id?.trim() ?? '';
  const body = data.body?.trim() ?? '';
  const senderNickname = data.sender_nickname?.trim().slice(0, 20) || '익명';
  const profileId = data.profile_id?.trim() ?? '';

  if (!profileId) {
    return Response.json({ error: '가입한 사용자만 메시지를 보낼 수 있어요.' }, { status: 401 });
  }

  if (!roomId) {
    return Response.json({ error: 'room_id가 필요해요.' }, { status: 400 });
  }

  if (body.length < 1 || body.length > 500) {
    return Response.json({ error: '메시지는 1자 이상 500자 이하로 입력해야 해요.' }, { status: 400 });
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, sender_profile_id, message_type, body) values (?, ?, ?, ?, ?, ?)',
  ).bind(id, roomId, senderNickname, profileId, 'text', body).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind(body, roomId).run();

  const message = await env.DB.prepare(
    'select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at from chat_messages where id = ?',
  ).bind(id).first();

  return Response.json({ message }, { status: 201 });
};