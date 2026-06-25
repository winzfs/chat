import { expect, test, type Page, type Request } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { E2E_SESSION_VALUE, seedSignedUpUser } from './helpers/sessionSeed';

const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

function watchApiRequests(page: Page, pathname: string, method: string) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === pathname && request.method() === method) {
      requests.push(request);
    }
  });
  return requests;
}

async function openSettings(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '설정' }).click();
}

test('프로필 저장 실패 시 서버 오류를 표시하고 기존 프로필을 보존한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { profileSyncStatus: 500 });
  const profileRequests = watchApiRequests(page, '/api/profile-sync', 'POST');

  await openSettings(page);
  await page.getByLabel('닉네임').fill('실패테스트');
  await page.getByRole('button', { name: '프로필 저장' }).click();

  await expect(page.getByText('프로필 저장 실패')).toBeVisible();
  await expect(page.getByText('테스트유저님')).toBeVisible();
  await expect(page.getByRole('button', { name: '프로필 저장' })).toBeEnabled();
  expect(profileRequests).toHaveLength(1);
  expect(profileRequests[0]?.headers().authorization).toBe(`Bearer ${E2E_SESSION_VALUE}`);
});

test('프로필 사진 업로드 실패 시 서버 오류를 표시하고 프로필 저장을 시도하지 않는다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { profileImageStatus: 500 });
  const imageRequests = watchApiRequests(page, '/api/profile-image', 'POST');
  const profileRequests = watchApiRequests(page, '/api/profile-sync', 'POST');

  await openSettings(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: ONE_BY_ONE_PNG,
  });
  await page.getByRole('button', { name: '적용하기' }).click();

  await expect(page.getByText('프로필 사진 업로드 실패')).toBeVisible();
  await expect(page.getByText('테스트유저님')).toBeVisible();
  await expect(page.getByRole('button', { name: '프로필 저장' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '적용하기' })).toHaveCount(0);
  expect(imageRequests).toHaveLength(1);
  expect(profileRequests).toHaveLength(0);
});

test('포인트 보상 실패 시 실패 메시지를 표시하고 다시 누를 수 있다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { pointClaimStatus: 500 });
  const pointRequests = watchApiRequests(page, '/api/points', 'POST');

  await openSettings(page);
  const attendanceButton = page.getByRole('button', { name: '출석체크 100P' });
  await attendanceButton.click();

  await expect(page.getByText('포인트 보상 실패')).toBeVisible();
  await expect(attendanceButton).toBeEnabled();
  expect(pointRequests).toHaveLength(1);
  expect(pointRequests[0]?.headers().authorization).toBe(`Bearer ${E2E_SESSION_VALUE}`);
});

test('마이룸 로드 실패 시 편집과 저장을 차단한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { myRoomLoadStatus: 500 });
  const saveRequests = watchApiRequests(page, '/api/my-room', 'POST');

  await openSettings(page);
  await page.getByRole('button', { name: '열기' }).first().click();

  await expect(page.getByText('마이룸을 불러오지 못해 저장할 수 없어요.')).toBeVisible();
  await expect(page.getByText('연결을 확인한 뒤 화면을 다시 열어주세요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '저장됨' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '꾸미기' })).toBeDisabled();
  expect(saveRequests).toHaveLength(0);
});
