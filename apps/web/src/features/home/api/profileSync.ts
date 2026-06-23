import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import { getProfileId } from './profileId';
import type { MyProfile } from './profileStorage';

export async function syncProfile(_legacyPreviousNickname: string, profile: MyProfile): Promise<void> {
  const response = await fetch(apiUrl('/api/profile-sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: getProfileId(),
      nickname: profile.nickname,
      age: profile.age,
      location: profile.location,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
    }),
  });

  await parseApiResponse<{ ok: boolean }>(response, '프로필을 서버에 저장하지 못했어요.');
}
