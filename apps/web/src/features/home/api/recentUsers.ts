import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import { getProfileId } from './profileId';
import type { MyProfile } from './profileStorage';

export type RecentUser = {
  id: string;
  nickname: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  avatar_url?: string | null;
  online: boolean;
  last_seen_at?: string;
};

export async function loadRecentUsers(): Promise<RecentUser[]> {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/recent-users?${params.toString()}`), { cache: 'no-store' });
  const data = await parseApiResponse<{ users?: RecentUser[] }>(response, '최근 접속자를 불러오지 못했어요.');
  return data.users ?? [];
}

export async function touchRecentUser(profile: MyProfile): Promise<void> {
  const response = await fetch(apiUrl('/api/recent-users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...profile, profile_id: getProfileId() }),
  });

  await parseApiResponse<{ ok: boolean }>(response, '접속 상태를 갱신하지 못했어요.');
}
