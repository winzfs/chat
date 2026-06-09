type Env = { DB: D1Database };

type LeaveBody = {
  room_id?: string;
  profile_id?: string;
  nickname?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as LeaveBody;
  const roomId = body.room_id?.trim() ?? '';
  const profileId = body.profile_id?.trim() ?? '';
  const nickname = body.nickname?.trim().slice(0, 20) || '상대방';

  if (!profileId) {
    return Response.json({ error: '가입한 사용자만 채팅방을 나갈 수 있어요.' }, { status: 401 });
  }

  if (!roomId) {
    return Response.json({ error: 'room_id가 필요해요.' }, { status: 400 });
  }

  const message = `${nickname}님이 나갔습니다.`;
  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_messages (id, room_id, sender_nickname, message_type, body) values (?, ?, ?, ?, ?)',
  ).bind(id, roomId, 'system', 'text', message).run();

  await env.DB.prepare(
    'update chat_rooms set last_message = ?, last_message_at = datetime("now"), updated_at = datetime("now") where id = ?',
  ).bind(message, roomId).run();

  return Response.json({ ok: true });
};
