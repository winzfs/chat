type Env = {
  DB: D1Database;
  IMAGES: R2Bucket;
};

async function ensureChatImageColumns(env: Env) {
  try {
    await env.DB.prepare('alter table chat_messages add column sender_profile_id text').run();
  } catch {
    // column already exists
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
}

async function hasRecentUser(env: Env, profileId: string) {
  try {
    const user = await env.DB.prepare('select id from recent_users where id = ? limit 1').bind(profileId).first();
    return Boolean(user);
  } catch {
    // recent_users may not exist on a fresh DB yet. The required profile_id check still protects anonymous uploads.
    return true;
  }
}

async function unhideRoom(env: Env, roomId: string, profileId: string) {
  if (!profileId) return;

  await env.DB.prepare(
    `update chat_room_exits
     set is_hidden = 0, updated_at = datetime('now')
     where room_id = ? and profile_id = ?`,
  ).bind(roomId, profileId).run();
}

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
  await ensureChatImageColumns(env);

  const formData = await request.formData();
  const roomId = String(formData.get('room_id') ?? '').trim();
  const profileId = String(formData.get('profile_id') ?? '').trim();
  const senderNickname = String(formData.get('sender_nickname') ?? '').trim().slice(0, 20) || '익명';
  const file = formData.get('image');

  if (!profileId) {
    return Response.json({ error: '가입한 사용자만 이미지를 보낼 수 있어요.' }, { status: 401 });
  }

  if (!(await hasRecentUser(env, profileId))) {
    return Response.json({ error: '프로필 동기화 후 이미지를 보낼 수 있어요.' }, { status: 403 });
  }

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

  await unhideRoom(env, roomId, profileId);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const key = `chat/${roomId}/${profileId}/${crypto.randomUUID()}.${extension}`;
  const imageUrl = `/api/chat-images?key=${encodeURIComponent(key)}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, sender_profile_id, message_type, image_key, image_url) values (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, roomId, senderNickname, profileId, 'image', key, imageUrl).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind('사진을 보냈어요.', roomId).run();

  const message = await env.DB.prepare(
    'select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at from chat_messages where id = ?',
  ).bind(id).first();

  return Response.json({ message }, { status: 201 });
};
