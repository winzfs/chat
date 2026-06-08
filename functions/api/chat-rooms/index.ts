type Env = { DB: D1Database };

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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let rooms = await listRooms(env);

  if (rooms.length === 0) {
    await seedRooms(env);
    rooms = await listRooms(env);
  }

  return Response.json({ rooms });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as { title?: string };
  const title = body.title?.trim() || '새 채팅방';

  const existingRoom = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at from chat_rooms where title = ? order by created_at desc limit 1',
  ).bind(title).first();

  if (existingRoom) {
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
