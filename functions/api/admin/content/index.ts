import { requireAdminProfile } from '../../../_shared/auth';

type Env = { DB: D1Database; AUTH_SECRET?: string; ADMIN_PROFILE_IDS?: string };

type ContentDeleteBody = {
  content_type?: string;
  id?: string;
};

const deletedMessageBody = '운영자에 의해 삭제된 메시지입니다.';
const allowedContentTypes = new Set(['talk_post', 'chat_message']);

function normalizeContentType(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function deleteTalkPost(env: Env, id: string) {
  const result = await env.DB.prepare('delete from talk_posts where id = ?').bind(id).run();
  if ((result.meta.changes ?? 0) < 1) {
    return Response.json({ error: '삭제할 토크를 찾지 못했어요.' }, { status: 404 });
  }

  return Response.json({ ok: true, content_type: 'talk_post', id });
}

async function redactChatMessage(env: Env, id: string) {
  const message = await env.DB.prepare(
    `select id, room_id, created_at
     from chat_messages
     where id = ?
     limit 1`,
  ).bind(id).first<{ id: string; room_id: string; created_at?: string | null }>();

  if (!message) {
    return Response.json({ error: '삭제할 채팅 메시지를 찾지 못했어요.' }, { status: 404 });
  }

  await env.DB.batch([
    env.DB.prepare(
      `update chat_messages
       set message_type = 'text', body = ?, image_key = null, image_url = null
       where id = ?`,
    ).bind(deletedMessageBody, id),
    env.DB.prepare(
      `update chat_rooms
       set last_message = ?, updated_at = datetime('now')
       where id = ? and last_message_at = ?`,
    ).bind(deletedMessageBody, message.room_id, message.created_at ?? ''),
  ]);

  return Response.json({ ok: true, content_type: 'chat_message', id });
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const auth = await requireAdminProfile(env, request);
  if ('response' in auth) return auth.response;

  const body = await request.json().catch(() => ({})) as ContentDeleteBody;
  const contentType = normalizeContentType(body.content_type);
  const id = body.id?.trim() ?? '';

  if (!allowedContentTypes.has(contentType)) {
    return Response.json({ error: '삭제할 콘텐츠 종류가 올바르지 않아요.' }, { status: 400 });
  }
  if (!id) {
    return Response.json({ error: '삭제할 콘텐츠 ID가 필요해요.' }, { status: 400 });
  }

  if (contentType === 'talk_post') return deleteTalkPost(env, id);
  return redactChatMessage(env, id);
};
