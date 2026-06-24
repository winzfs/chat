import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { seedSignedUpUser } from './helpers/sessionSeed';

test('토크 등록 실패 시 작성 중인 내용을 유지한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { talkCreateStatus: 500 });
  await page.goto('/');

  const composeButton = page.getByRole('button', { name: '작성하기' });
  await expect(composeButton).toBeVisible();
  await composeButton.click();

  const draft = '실패해도 사라지면 안 되는 문장';
  const dialog = page.getByRole('dialog');
  const textbox = dialog.getByRole('textbox');
  await textbox.fill(draft);
  await dialog.getByRole('button', { name: '등록하기' }).click();

  await expect(dialog).toBeVisible();
  await expect(textbox).toHaveValue(draft);
  await expect(page.getByText('토크 등록 실패')).toBeVisible();
});
