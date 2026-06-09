type Env = { DB: D1Database };

type ChatRoomBody = {
  title?: string;
  peer_nickname?: string;
};

async function listRooms(env: Env) {
  const { results } = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at from chat_rooms order by last_message_at desc limit 50',
  ).all();

  return results ?? [];
}

async function seedRooms(env: Env) {
  await env.DB.prepare(
    'insert or ignore into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now"))',
  ).bind('room-db-test', 'D1 테스트 채팅방', '이 방은 Cloudflare D1에서 불러온 실제 채팅방이에요.').run();

  await env.DB.prepare(
    'insert or ignore into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now", "-5 minutes"))',
  ).bind('room-image-test', 'R2 이미지 전송 테스트방', '이미지 전송은 R2로 붙일 예정이에요.').run();
}

function makeDirectTitle(peerNickname?: string) {
  const peer = peerNickname?.trim().slice(0, 20);
  return peer ? `${peer}님과의 대화` : null;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let rooms = await listRooms(env);

  if (rooms.length === 0) {
    await seedRooms(env);
    rooms = await listRooms(env);
  }

  return Response.json({ rooms });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as ChatRoomBody;
  const directTitle = makeDirectTitle(body.peer_nickname);
  const title = directTitle || body.title?.trim() || '새 채팅방';
  const legacyTitle = body.peer_nickname ? `${body.peer_nickname.trim().slice(0, 20)} room` : title;

  const existingRoom = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at from chat_rooms where title = ? or title = ? order by created_at desc limit 1',
  ).bind(title, legacyTitle).first();

  if (existingRoom) {
    if (existingRoom.title !== title) {
      await env.DB.prepare('update chat_rooms set title = ?, updated_at = datetime("now") where id = ?').bind(title, existingRoom.id).run();
      return Response.json({ ...existingRoom, title });
    }
    return Response.json(existingRoom);
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now"))',
  ).bind(id, title, '아직 메시지가 없어요.').run();

  const room = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at from chat_rooms where id = ?',
  ).bind(id).first();

  return Response.json(room, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();

  if (!id) {
    return Response.json({ error: 'id가 필요해요.' }, { status: 400 });
  }

  await env.DB.prepare('delete from chat_messages where room_id = ?').bind(id).run();
  await env.DB.prepare('delete from chat_rooms where id = ?').bind(id).run();

  return Response.json({ ok: true });
};
