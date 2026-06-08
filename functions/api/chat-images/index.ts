type Env = {
  DB: D1Database;
  IMAGES: R2Bucket;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

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
      'Cache-Control': 'public, max-age=31536000',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const formData = await request.formData();
  const roomId = String(formData.get('room_id') ?? '').trim();
  const file = formData.get('image');

  if (!roomId) {
    return Response.json({ error: 'room_id가 필요해요.' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: '이미지 파일이 필요해요.' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return Response.json({ error: '이미지 파일만 업로드할 수 있어요.' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: '이미지는 5MB 이하만 업로드할 수 있어요.' }, { status: 400 });
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const key = `chat/${roomId}/${crypto.randomUUID()}.${extension}`;
  const imageUrl = `/api/chat-images?key=${encodeURIComponent(key)}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, message_type, image_key, image_url) values (?, ?, ?, ?, ?, ?)',
  ).bind(id, roomId, '나', 'image', key, imageUrl).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind('사진을 보냈어요.', roomId).run();

  const message = await env.DB.prepare(
    'select id, room_id, sender_nickname, message_type, body, image_key, image_url, created_at from chat_messages where id = ?',
  ).bind(id).first();

  return Response.json({ message }, { status: 201 });
};
