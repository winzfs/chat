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

export async function loadProfileById(profileId?: string | null) {
  if (!profileId) return null;

  const params = new URLSearchParams({ profile_id: profileId });
  const response = await fetch(`/api/profile-lookup?${params.toString()}`);
  if (!response.ok) return null;

  const data = await response.json() as { profile?: LookupProfile | null };
  return data.profile ?? null;
}
