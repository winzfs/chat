import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';

test('가입 정보 저장 실패 시 가입 화면을 유지한다', async ({ page }) => {
  await installMockRoutes(page, { profileSyncStatus: 500 });
  await page.goto('/');

  await page.getByLabel('닉네임').fill('가입테스트');
  await page.getByLabel('성별').selectOption('female');
  await page.getByLabel('나이').fill('25');
  await page.getByLabel('지역').selectOption('서울특별시');
  await page.getByRole('button', { name: '가입하고 시작하기' }).click();

  await expect(page.getByRole('alert')).toContainText('프로필 저장 실패');
  await expect(page.getByRole('heading', { name: '20세 이상 가입' })).toBeVisible();
});
