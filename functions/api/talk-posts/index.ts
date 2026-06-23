import { jsonError } from '../../_shared/auth';

type Env = { DB: D1Database };

type TalkPostBody = {
  text?: string;
  mood?: string;
};

type TalkProfile = {
  nickname: string;
  age: number | null;
  location: string | null;
  avatar_url?: string | null;
};

const TALK_DAILY_REWARD = 100;

async function ensurePointTables(env: Env) {
  await env.DB.prepare(
    `create table if not exists user_points (
      profile_id text primary key,
      balance integer not null default 0,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare(
    `create table if not exists point_transactions (
      id text primary key,
      profile_id text not null,
      amount integer not null,
      reason text not null,
      reference_id text,
      description text,
      created_at text not null default (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare(
    `create table if not exists daily_point_claims (
      profile_id text not null,
      claim_type text not null,
      claim_date text not null,
      amount integer not null,
      created_at text not null default (datetime('now')),
      primary key (profile_id, claim_type, claim_date)
    )`,
  ).run();
}

async function ensurePointAccount(env: Env, profileId: string) {
  await env.DB.prepare(
    `insert into user_points (profile_id, balance, created_at, updated_at)
     values (?, 0, datetime('now'), datetime('now'))
     on conflict(profile_id) do nothing`,
  ).bind(profileId).run();
}

async function getToday(env: Env) {
  const row = await env.DB.prepare("select date('now', '+9 hours') as today").first<{ today: string }>();
  return row?.today ?? new Date().toISOString().slice(0, 10);
}

async function getBalance(env: Env, profileId: string) {
  const row = await env.DB.prepare('select balance from user_points where profile_id = ?').bind(profileId).first<{ balance: number }>();
  return Number(row?.balance ?? 0);
}

async function awardDailyTalkPoints(env: Env, profileId: string, postId: string) {
  await ensurePointTables(env);
  await ensurePointAccount(env, profileId);
  const today = await getToday(env);

  try {
    await env.DB.batch([
      env.DB.prepare(
        `insert into daily_point_claims (profile_id, claim_type, claim_date, amount)
         values (?, 'talk_daily', ?, ?)`,
      ).bind(profileId, today, TALK_DAILY_REWARD),
      env.DB.prepare(
        `update user_points
         set balance = balance + ?, updated_at = datetime('now')
         where profile_id = ?`,
      ).bind(TALK_DAILY_REWARD, profileId),
      env.DB.prepare(
        `insert into point_transactions (id, profile_id, amount, reason, reference_id, description)
         values (?, ?, ?, 'talk_daily', ?, '토크 작성 보상')`,
      ).bind(crypto.randomUUID(), profileId, TALK_DAILY_REWARD, postId),
    ]);
  } catch {
    return { awarded: false, amount: 0, balance: await getBalance(env, profileId) };
  }

  return { awarded: true, amount: TALK_DAILY_REWARD, balance: await getBalance(env, profileId) };
}

async function ensureTalkPostColumns(env: Env) {
  for (const query of [
    'alter table talk_posts add column profile_id text',
    'alter table talk_posts add column avatar_url text',
  ]) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // Legacy databases may already contain the column.
    }
  }
}

async function loadTalkProfile(env: Env, profileId: string) {
  return env.DB.prepare(
    'select nickname, age, location, avatar_url from recent_users where id = ? limit 1',
  ).bind(profileId).first<TalkProfile>();
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
  const mood = body.mood?.trim().slice(0, 30) || '가벼운 수다';
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';

  if (!profileId) return jsonError('가입한 사용자만 토크를 작성할 수 있어요.', 401);
  if (text.length < 1 || text.length > 80) return jsonError('한줄 토크는 1자 이상 80자 이하로 입력해야 해요.', 400);

  const profile = await loadTalkProfile(env, profileId);
  if (!profile) return jsonError('프로필 동기화 후 토크를 작성할 수 있어요.', 403);

  const id = crypto.randomUUID();
  const tags = JSON.stringify(['방금작성', mood.replaceAll(' ', '')]);

  await env.DB.prepare(
    'insert into talk_posts (id, profile_id, avatar_url, nickname, age, location, mood, text, tags, likes, replies, online) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1)',
  ).bind(
    id,
    profileId,
    profile.avatar_url ?? '',
    profile.nickname,
    profile.age,
    profile.location,
    mood,
    text,
    tags,
  ).run();

  const point_reward = await awardDailyTalkPoints(env, profileId, id);
  const post = await env.DB.prepare(
    'select id, profile_id, avatar_url, nickname, age, location, mood, text, tags, likes, replies, online, created_at from talk_posts where id = ?',
  ).bind(id).first();

  return Response.json({
    post: {
      ...post,
      tags: typeof post?.tags === 'string' ? JSON.parse(post.tags) : [],
      online: Boolean(post?.online),
    },
    point_reward,
  }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  await ensureTalkPostColumns(env);

  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';

  if (!id) return jsonError('id가 필요해요.', 400);
  if (!profileId) return jsonError('가입한 사용자만 토크를 삭제할 수 있어요.', 401);

  const result = await env.DB.prepare('delete from talk_posts where id = ? and profile_id = ?').bind(id, profileId).run();
  if ((result.meta.changes ?? 0) < 1) return jsonError('내가 작성한 토크를 찾지 못했어요.', 404);

  return Response.json({ ok: true });
};
