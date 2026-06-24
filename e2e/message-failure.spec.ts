import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { seedSignedUpUser } from './helpers/sessionSeed';

test('메시지 전송 실패 시 입력한 내용을 유지한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { chatMessageStatus: 500, withPeerTalk: true });
  page.on('dialog', (dialog) => void dialog.accept());

  await page.goto('/');
  await page.getByRole('button', { name: '쪽지 100P' }).click();

  const messageInput = page.getByLabel('메시지 입력');
  const draft = '전송에 실패해도 남아 있어야 하는 메시지';
  await expect(messageInput).toBeVisible();
  await messageInput.fill(draft);
  await page.getByRole('button', { name: '보내기' }).click();

  await expect(page.getByText('메시지 전송 실패')).toBeVisible();
  await expect(messageInput).toHaveValue(draft);
  await expect(page.getByRole('button', { name: '보내기' })).toBeEnabled();
});
