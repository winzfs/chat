import { apiUrl } from './apiBase';

export type LookupProfile = {
  id?: string;
  nickname: string;
  age?: number | string | null;
  location?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  online?: boolean;
  last_seen_at?: string | null;
};

export async function loadProfile(profileId?: string | null, nickname?: string | null) {
  const params = new URLSearchParams();
  if (profileId) params.set('profile_id', profileId);
  if (!profileId && nickname) params.set('nickname', nickname);
  if (!params.toString()) return null;

  const response = await fetch(apiUrl(`/api/profile-lookup?${params.toString()}`));
  if (!response.ok) return null;

  const data = await response.json() as { profile?: LookupProfile | null };
  return data.profile ?? null;
}

export async function loadProfileById(profileId?: string | null) {
  return loadProfile(profileId, null);
}
