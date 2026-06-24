import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { seedSignedUpUser } from './helpers/sessionSeed';

test('회원 탈퇴 실패 시 확인창을 유지하고 다시 시도할 수 있다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { accountDeleteStatus: 500 });

  await page.goto('/');
  await page.getByRole('button', { name: '설정' }).click();
  await page.getByRole('button', { name: '회원 탈퇴' }).click();

  const dialog = page.getByRole('dialog');
  const deleteButton = dialog.getByRole('button', { name: '탈퇴하고 삭제' });
  await deleteButton.click();

  await expect(page.getByRole('alert')).toContainText('회원 탈퇴 처리 실패');
  await expect(dialog).toBeVisible();
  await expect(deleteButton).toBeEnabled();
});

test('회원 탈퇴 성공 시 로컬 계정 상태를 지우고 가입 화면으로 돌아간다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page);

  await page.goto('/');
  await page.getByRole('button', { name: '설정' }).click();
  await page.getByRole('button', { name: '회원 탈퇴' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '탈퇴하고 삭제' }).click();

  await expect(page.getByRole('heading', { name: '20세 이상 가입' })).toBeVisible();
  const remainingKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('chitchat.')));
  expect(remainingKeys).toEqual([]);
});
