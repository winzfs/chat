import { expect, test, type Page, type Request } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { E2E_PROFILE_ID, E2E_SESSION_VALUE, seedSignedUpUser } from './helpers/sessionSeed';

function watchAccountDeleteRequests(page: Page) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/account' && request.method() === 'DELETE') {
      requests.push(request);
    }
  });
  return requests;
}

test('회원 탈퇴 실패 시 확인창을 유지하고 다시 시도할 수 있다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { accountDeleteStatus: 500 });
  const deleteRequests = watchAccountDeleteRequests(page);

  await page.goto('/');
  await page.getByRole('button', { name: '마이' }).click();
  await page.getByRole('button', { name: '회원 탈퇴' }).click();

  const dialog = page.getByRole('dialog');
  const deleteButton = dialog.getByRole('button', { name: '탈퇴하고 삭제' });
  await deleteButton.click();

  await expect(page.getByRole('alert')).toContainText('회원 탈퇴 처리 실패');
  await expect(dialog).toBeVisible();
  await expect(deleteButton).toBeEnabled();
  expect(deleteRequests).toHaveLength(1);
  expect(deleteRequests[0]?.headers().authorization).toBe(`Bearer ${E2E_SESSION_VALUE}`);
});

test('회원 탈퇴 성공 시 로컬 계정 상태를 지우고 가입 화면으로 돌아간다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page);
  const deleteRequests = watchAccountDeleteRequests(page);

  await page.goto('/');
  await page.getByRole('button', { name: '마이' }).click();
  await page.getByRole('button', { name: '회원 탈퇴' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '탈퇴하고 삭제' }).click();

  await expect(page.getByRole('heading', { name: '20세 이상 가입' })).toBeVisible();
  const localState = await page.evaluate(() => {
    const rawSession = localStorage.getItem('chitchat.authSession.v1');
    return {
      remainingKeys: ['chitchat.signup.v1', 'chitchat.myProfile.v1'].filter((key) => localStorage.getItem(key) !== null),
      profileId: localStorage.getItem('chitchat.profileId.v1'),
      session: rawSession ? JSON.parse(rawSession) as { profile_id?: string } : null,
    };
  });

  expect(localState.remainingKeys).toEqual([]);
  expect(localState.profileId).toBeTruthy();
  expect(localState.profileId).not.toBe(E2E_PROFILE_ID);
  expect(localState.session?.profile_id).toBe(localState.profileId);
  expect(deleteRequests).toHaveLength(1);
  expect(deleteRequests[0]?.headers().authorization).toBe(`Bearer ${E2E_SESSION_VALUE}`);
});
