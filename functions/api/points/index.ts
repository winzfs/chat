type Env = { DB: D1Database };

type PointActionBody = {
  action?: 'attendance' | 'ad_reward';
};

const DAILY_REWARD = 100;

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

async function getPointHistory(env: Env, profileId: string) {
  const { results } = await env.DB.prepare(
    `select id, amount, reason, reference_id, description, created_at
     from point_transactions
     where profile_id = ?
     order by created_at desc
     limit 30`,
  ).bind(profileId).all();

  return results ?? [];
}

async function claimDailyReward(env: Env, profileId: string, claimType: string, amount: number, description: string) {
  await ensurePointAccount(env, profileId);
  const today = await getToday(env);

  if (await hasClaimedToday(env, profileId, claimType, today)) {
    return { awarded: false, balance: await getBalance(env, profileId), today };
  }

  try {
    await env.DB.batch([
      env.DB.prepare(
        `insert into daily_point_claims (profile_id, claim_type, claim_date, amount)
         values (?, ?, ?, ?)`,
      ).bind(profileId, claimType, today, amount),
      env.DB.prepare(
        `update user_points
         set balance = balance + ?, updated_at = datetime('now')
         where profile_id = ?`,
      ).bind(amount, profileId),
      env.DB.prepare(
        `insert into point_transactions (id, profile_id, amount, reason, reference_id, description)
         values (?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), profileId, amount, claimType, today, description),
    ]);
  } catch (error) {
    if (await hasClaimedToday(env, profileId, claimType, today)) {
      return { awarded: false, balance: await getBalance(env, profileId), today };
    }
    throw error;
  }

  return { awarded: true, balance: await getBalance(env, profileId), today };
}

function authenticatedProfileId(request: Request) {
  return request.headers.get('x-auth-profile-id')?.trim() ?? '';
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const profileId = authenticatedProfileId(request);

  if (!profileId) {
    return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  const today = await getToday(env);
  const balance = await getBalance(env, profileId);
  const attendance_claimed = await hasClaimedToday(env, profileId, 'attendance', today);
  const talk_reward_claimed = await hasClaimedToday(env, profileId, 'talk_daily', today);
  const ad_reward_claimed = await hasClaimedToday(env, profileId, 'ad_reward', today);
  const history = await getPointHistory(env, profileId);

  return Response.json({ balance, today, attendance_claimed, talk_reward_claimed, ad_reward_claimed, history });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json().catch(() => ({})) as PointActionBody;
  const profileId = authenticatedProfileId(request);

  if (!profileId) {
    return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });
  }

  if (body.action === 'attendance') {
    const result = await claimDailyReward(env, profileId, 'attendance', DAILY_REWARD, '출석체크 보상');
    return Response.json({
      ...result,
      amount: result.awarded ? DAILY_REWARD : 0,
      message: result.awarded ? '출석체크로 100포인트를 받았어요.' : '오늘 출석체크 보상은 이미 받았어요.',
    });
  }

  if (body.action === 'ad_reward') {
    return Response.json({
      error: '광고 보상은 광고 완료 검증 연동 후 제공할 예정이에요.',
      code: 'AD_REWARD_NOT_AVAILABLE',
    }, { status: 503 });
  }

  return Response.json({ error: '지원하지 않는 포인트 요청이에요.' }, { status: 400 });
};
