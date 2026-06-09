import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';

export function getAdminRequestHeaders() {
  return { 'x-profile-id': getProfileId() };
}

export async function loadAdminStatus() {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/admin/me?${params.toString()}`), { headers: getAdminRequestHeaders() });
  if (!response.ok) return false;

  const data = await response.json() as { is_admin?: boolean };
  return Boolean(data.is_admin);
}

export async function loadUserReview(targetId: string) {
  const params = new URLSearchParams({ target_id: targetId });
  const response = await fetch(apiUrl(`/api/admin/user-review?${params.toString()}`), { headers: getAdminRequestHeaders() });
  if (!response.ok) return null;

  return await response.json() as {
    user?: Record<string, unknown> | null;
    talk_posts?: Array<Record<string, unknown>>;
    rooms?: Array<Record<string, unknown>>;
    room_messages?: Array<Record<string, unknown>>;
    sent_messages?: Array<Record<string, unknown>>;
  };
}
