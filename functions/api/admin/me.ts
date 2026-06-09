type Env = { ADMIN_PROFILE_IDS?: string };

function getProfileId(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-profile-id')?.trim() || url.searchParams.get('profile_id')?.trim() || '';
}

function isAdmin(env: Env, profileId: string) {
  const adminIds = (env.ADMIN_PROFILE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return Boolean(profileId && adminIds.includes(profileId));
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const profileId = getProfileId(request);
  return Response.json({ is_admin: isAdmin(env, profileId) });
};
