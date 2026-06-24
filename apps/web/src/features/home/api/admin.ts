import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import { getProfileId } from './profileId';

export type ModeratedContentType = 'talk_post' | 'chat_message';

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

export async function deleteModeratedContent(contentType: ModeratedContentType, id: string) {
  const response = await fetch(apiUrl('/api/admin/content'), {
    method: 'DELETE',
    headers: { ...getAdminRequestHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ content_type: contentType, id }),
  });

  return parseApiResponse<{ ok?: boolean; content_type?: ModeratedContentType; id?: string }>(response, '콘텐츠를 삭제하지 못했어요.');
}
