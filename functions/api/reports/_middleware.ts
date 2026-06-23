export const onRequest: PagesFunction = async ({ request, next }) => {
  if (request.method !== 'POST') return next();

  const sessionId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  const body = await request.clone().json().catch(() => ({})) as { reporter_id?: string };
  const reporterId = body.reporter_id?.trim() ?? '';

  if (!sessionId) return Response.json({ error: '로그인이 필요해요.' }, { status: 401 });
  if (!reporterId) return Response.json({ error: 'reporter_id가 필요해요.' }, { status: 400 });
  if (reporterId !== sessionId) return Response.json({ error: '다른 사용자 이름으로 신고할 수 없어요.' }, { status: 403 });

  return next();
};
