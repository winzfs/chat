import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';

test('가입 정보 저장 성공 후 홈 화면으로 진입한다', async ({ page }) => {
  await installMockRoutes(page);
  await page.goto('/');

  await page.getByLabel('닉네임').fill('가입테스트');
  await page.getByLabel('성별').selectOption('female');
  await page.getByLabel('나이').fill('25');
  await page.getByLabel('지역').selectOption('서울특별시');
  await page.getByRole('button', { name: '가입하고 시작하기' }).click();

  await expect(page.getByRole('heading', { name: '오늘 누구와 이야기해볼까요?' })).toBeVisible();
});
