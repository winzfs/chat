import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';
import type { MyProfile } from './profileStorage';

export async function syncProfile(previousNickname: string, profile: MyProfile): Promise<void> {
  await fetch(apiUrl('/api/profile-sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: getProfileId(),
      previous_nickname: previousNickname,
      nickname: profile.nickname,
      age: profile.age,
      location: profile.location,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
    }),
  });
}
