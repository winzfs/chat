import { expect, test } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { seedSignedUpUser } from './helpers/sessionSeed';

test('쪽지 버튼을 연속으로 눌러도 채팅방 요청은 한 번만 보낸다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { directChatDelayMs: 250, withPeerTalk: true });

  let createRequestCount = 0;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/chat-rooms' && request.method() === 'POST') {
      createRequestCount += 1;
    }
  });
  page.on('dialog', (dialog) => void dialog.accept());

  await page.goto('/');
  const messageButton = page.getByRole('button', { name: '쪽지 100P' });
  await expect(messageButton).toBeVisible();

  await messageButton.evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });

  await expect(page.getByRole('region', { name: '채팅방' })).toBeVisible();
  expect(createRequestCount).toBe(1);
});
