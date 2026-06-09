type Env = { DB: D1Database; ADMIN_PROFILE_IDS?: string };

function getRequesterProfileId(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-profile-id')?.trim() || url.searchParams.get('admin_profile_id')?.trim() || '';
}

function isAdmin(env: Env, profileId: string) {
  const adminIds = (env.ADMIN_PROFILE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return Boolean(profileId && adminIds.includes(profileId));
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const requesterId = getRequesterProfileId(request);
  const targetId = url.searchParams.get('target_id')?.trim() ?? '';

  if (!isAdmin(env, requesterId)) {
    return Response.json({ error: '운영자만 접근할 수 있어요.' }, { status: 403 });
  }

  if (!targetId) {
    return Response.json({ error: 'target_id가 필요해요.' }, { status: 400 });
  }

  const user = await env.DB.prepare(
    `select id, nickname, gender, age, location, bio, avatar_url, updated_at
     from recent_users
     where id = ?`,
  ).bind(targetId).first();

  const talkPosts = await env.DB.prepare(
    `select id, nickname, age, location, mood, text, avatar_url, created_at
     from talk_posts
     where profile_id = ?
     order by created_at desc
     limit 50`,
  ).bind(targetId).all();

  const rooms = await env.DB.prepare(
    `select id, title, last_message, last_message_at, participant_a_id, participant_a_nickname, participant_b_id, participant_b_nickname, created_at
     from chat_rooms
     where participant_a_id = ? or participant_b_id = ?
     order by coalesce(last_message_at, created_at) desc
     limit 50`,
  ).bind(targetId, targetId).all();

  const roomIds = (rooms.results ?? []).map((room) => String((room as { id?: unknown }).id ?? '')).filter(Boolean);
  const messages = [] as unknown[];

  for (const roomId of roomIds.slice(0, 20)) {
    const roomMessages = await env.DB.prepare(
      `select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at
       from chat_messages
       where room_id = ?
       order by created_at desc
       limit 50`,
    ).bind(roomId).all();

    messages.push(...(roomMessages.results ?? []));
  }

  const sentMessages = await env.DB.prepare(
    `select id, room_id, sender_nickname, sender_profile_id, message_type, body, image_key, image_url, created_at
     from chat_messages
     where sender_profile_id = ?
     order by created_at desc
     limit 100`,
  ).bind(targetId).all();

  return Response.json({
    user: user ?? null,
    talk_posts: talkPosts.results ?? [],
    rooms: rooms.results ?? [],
    room_messages: messages,
    sent_messages: sentMessages.results ?? [],
  });
};
