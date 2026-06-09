type Env = { DB: D1Database };

type TalkPostBody = {
  id?: string;
  profile_id?: string;
  avatar_url?: string;
  text?: string;
  mood?: string;
  nickname?: string;
  age?: number;
  location?: string;
};

async function ensureTalkPostColumns(env: Env) {
  const columns = [
    'alter table talk_posts add column profile_id text',
    'alter table talk_posts add column avatar_url text',
  ];

  for (const query of columns) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // column already exists
    }
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  await ensureTalkPostColumns(env);

  const { results } = await env.DB.prepare(
    'select id, profile_id, avatar_url, nickname, age, location, mood, text, tags, likes, replies, online, created_at from talk_posts order by created_at desc limit 50',
  ).all();

  const posts = (results ?? []).map((row) => ({
    ...row,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : [],
    online: Boolean(row.online),
  }));

  return Response.json({ posts });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureTalkPostColumns(env);

  const body = await request.json() as TalkPostBody;
  const text = body.text?.trim() ?? '';
  const mood = body.mood?.trim() || '가벼운 수다';
  const profileId = body.profile_id?.trim() || '';
  const avatarUrl = body.avatar_url?.trim() || '';
  const nickname = body.nickname?.trim().slice(0, 20) || '익명';
  const age = Number.isFinite(body.age) ? body.age : 25;
  const location = body.location?.trim().slice(0, 20) || '내 주변';

  if (!profileId) {
    return Response.json({ error: '가입한 사용자만 토크를 작성할 수 있어요.' }, { status: 401 });
  }

  if (text.length < 1 || text.length > 80) {
    return Response.json({ error: '한줄 토크는 1자 이상 80자 이하로 입력해야 해요.' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const tags = JSON.stringify(['방금작성', mood.split(' ').join('')]);

  await env.DB.prepare(
    'insert into talk_posts (id, profile_id, avatar_url, nickname, age, location, mood, text, tags, likes, replies, online) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1)',
  ).bind(id, profileId, avatarUrl, nickname, age, location, mood, text, tags).run();

  const post = await env.DB.prepare(
    'select id, profile_id, avatar_url, nickname, age, location, mood, text, tags, likes, replies, online, created_at from talk_posts where id = ?',
  ).bind(id).first();

  return Response.json({
    post: {
      ...post,
      tags: typeof post?.tags === 'string' ? JSON.parse(post.tags) : [],
      online: Boolean(post?.online),
    },
  }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();

  if (!id) {
    return Response.json({ error: 'id가 필요해요.' }, { status: 400 });
  }

  await env.DB.prepare('delete from talk_posts where id = ?').bind(id).run();
  return Response.json({ ok: true });
};
