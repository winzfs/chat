type Env = { DB: D1Database };

type PointActionBody = {
  profile_id?: string;
  action?: 'attendance';
};

const ATTENDANCE_REWARD = 100;

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

  await env.DB.prepare('create index if not exists point_transactions_profile_idx on point_transactions(profile_id, created_at)').run();
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
  await ensurePointAccount(env, profileId);
  const row = await env.DB.prepare('select balance from user_points where profile_id = ?').bind(profileId).first<{ balance: number }>();
  return Number(row?.balance ?? 0);
}

async function hasClaimedToday(env: Env, profileId: string, claimType: string, today: string) {
  const row = await env.DB.prepare(
    'select 1 as claimed from daily_point_claims where profile_id = ? and claim_type = ? and claim_date = ? limit 1',
  ).bind(profileId, claimType, today).first<{ claimed: number }>();

  return Boolean(row?.claimed);
}

async function claimDailyReward(env: Env, profileId: string, claimType: string, amount: number, description: string) {
  await ensurePointTables(env);
  await ensurePointAccount(env, profileId);
  const today = await getToday(env);

  const inserted = await env.DB.prepare(
    `insert or ignore into daily_point_claims (profile_id, claim_type, claim_date, amount)
     values (?, ?, ?, ?)`,
  ).bind(profileId, claimType, today, amount).run();

  if ((inserted.meta.changes ?? 0) < 1) {
    return { awarded: false, balance: await getBalance(env, profileId), today };
  }

  await env.DB.prepare(
    `update user_points
     set balance = balance + ?, updated_at = datetime('now')
     where profile_id = ?`,
  ).bind(amount, profileId).run();

  await env.DB.prepare(
    `insert into point_transactions (id, profile_id, amount, reason, reference_id, description)
     values (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), profileId, amount, claimType, today, description).run();

  return { awarded: true, balance: await getBalance(env, profileId), today };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  await ensurePointTables(env);
  const profileId = new URL(request.url).searchParams.get('profile_id')?.trim() ?? '';

  if (!profileId) {
    return Response.json({ error: 'profile_id가 필요해요.' }, { status: 400 });
  }

  const today = await getToday(env);
  const balance = await getBalance(env, profileId);
  const attendance_claimed = await hasClaimedToday(env, profileId, 'attendance', today);
  const talk_reward_claimed = await hasClaimedToday(env, profileId, 'talk_daily', today);

  return Response.json({ balance, today, attendance_claimed, talk_reward_claimed });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json() as PointActionBody;
  const profileId = body.profile_id?.trim() ?? '';

  if (!profileId) {
    return Response.json({ error: 'profile_id가 필요해요.' }, { status: 400 });
  }

  if (body.action !== 'attendance') {
    return Response.json({ error: '지원하지 않는 포인트 요청이에요.' }, { status: 400 });
  }

  const result = await claimDailyReward(env, profileId, 'attendance', ATTENDANCE_REWARD, '출석체크 보상');

  return Response.json({
    ...result,
    amount: result.awarded ? ATTENDANCE_REWARD : 0,
    message: result.awarded ? '출석체크로 100포인트를 받았어요.' : '오늘 출석체크 보상은 이미 받았어요.',
  });
};
