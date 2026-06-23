type Env = { ADMIN_PROFILE_IDS?: string };

function isAdmin(env: Env, profileId: string) {
  const adminIds = (env.ADMIN_PROFILE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return Boolean(profileId && adminIds.includes(profileId));
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const profileId = request.headers.get('x-auth-profile-id')?.trim() ?? '';
  return Response.json({ is_admin: isAdmin(env, profileId) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
};
