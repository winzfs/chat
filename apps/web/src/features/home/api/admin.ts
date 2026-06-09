import { getProfileId } from './profileId';

export function getAdminRequestHeaders() {
  return { 'x-profile-id': getProfileId() };
}

export async function loadAdminStatus() {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(`/api/admin/me?${params.toString()}`, { headers: getAdminRequestHeaders() });
  if (!response.ok) return false;

  const data = await response.json() as { is_admin?: boolean };
  return Boolean(data.is_admin);
}
