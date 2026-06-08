type Env = { DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at from chat_rooms order by last_message_at desc limit 50',
  ).all();

  return Response.json({ rooms: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json<{ title?: string }>();
  const id = crypto.randomUUID();
  const title = body.title?.trim() || '새 채팅방';

  await env.DB.prepare(
    'insert into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now"))',
  ).bind(id, title, '아직 메시지가 없어요.').run();

  return Response.json({ id, title }, { status: 201 });
};
