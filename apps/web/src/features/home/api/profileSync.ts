import type { MyProfile } from './profileStorage';

export async function syncProfile(previousNickname: string, profile: MyProfile): Promise<void> {
  await fetch('/api/profile-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      previous_nickname: previousNickname,
      nickname: profile.nickname,
      age: profile.age,
      location: profile.location,
      bio: profile.bio,
    }),
  });
}
