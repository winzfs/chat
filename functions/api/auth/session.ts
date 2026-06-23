import { authenticatedProfileId, issueAuthSession, jsonError } from '../../_shared/auth';

type Env = { AUTH_SECRET?: string };

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  const session = await issueAuthSession(env);

  if (!session) {
    return jsonError('AUTH_SECRET 환경변수를 32자 이상으로 설정해주세요.', 503);
  }

  return Response.json(session, {
    status: 201,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const profileId = await authenticatedProfileId(env, request);

  if (!profileId) {
    return jsonError('유효한 로그인 세션이 아니에요.', 401);
  }

  return Response.json({ profile_id: profileId }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
};
