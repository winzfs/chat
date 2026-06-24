import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { seedSignedUpUser } from './helpers/sessionSeed';

test('ESC로 모달을 닫으면 이전 버튼으로 포커스가 돌아간다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page);
  await page.goto('/');

  const composeButton = page.getByRole('button', { name: '작성하기' });
  await composeButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(composeButton).toBeFocused();
});
