import type { Page } from '@playwright/test';

export const E2E_PROFILE_ID = 'e2e-profile';
export const E2E_SESSION_VALUE = 'e2e-session';

export async function seedSignedUpUser(page: Page) {
  await page.addInitScript(({ profileId, sessionValue }) => {
    localStorage.setItem('chitchat.authSession.v1', JSON.stringify({ profile_id: profileId, token: sessionValue }));
    localStorage.setItem('chitchat.profileId.v1', profileId);
    localStorage.setItem('chitchat.signup.v1', 'yes');
    localStorage.setItem('chitchat.myProfile.v1', JSON.stringify({
      nickname: '테스트유저',
      gender: 'female',
      age: 25,
      location: '서울특별시',
      bio: '테스트 프로필',
      avatar_url: '',
    }));
  }, { profileId: E2E_PROFILE_ID, sessionValue: E2E_SESSION_VALUE });
}
