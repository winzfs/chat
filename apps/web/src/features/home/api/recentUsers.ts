import { apiUrl } from './apiBase';
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
  last_seen_at: string;
};

export async function loadRecentUsers(): Promise<RecentUser[]> {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/recent-users?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { users?: RecentUser[] };
  return data.users ?? [];
}

export async function touchRecentUser(profile: MyProfile): Promise<void> {
  await fetch(apiUrl('/api/recent-users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...profile, profile_id: getProfileId() }),
  });
}
