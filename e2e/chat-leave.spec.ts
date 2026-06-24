import { expect, test, type Page } from '@playwright/test';
import { installMockRoutes } from './helpers/mockRoutes';
import { seedSignedUpUser } from './helpers/sessionSeed';

async function openChatList(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '채팅' }).click();
  await expect(page.getByText('마지막 메시지')).toBeVisible();
}

test('채팅방 나가기 취소 시 요청하지 않고 방을 유지한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { withChatRoom: true });

  let leaveRequestCount = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/chat-room-leave') leaveRequestCount += 1;
  });

  await openChatList(page);
  await page.getByRole('button', { name: '나가기' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '취소' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('마지막 메시지')).toBeVisible();
  expect(leaveRequestCount).toBe(0);
});

test('채팅방 나가기 실패 시 방과 확인창을 유지하고 버튼을 복구한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { leaveRoomStatus: 500, withChatRoom: true });

  await openChatList(page);
  await page.getByRole('button', { name: '나가기' }).click();

  const dialog = page.getByRole('dialog');
  const confirmButton = dialog.getByRole('button', { name: '나가기', exact: true });
  await confirmButton.click();

  await expect(page.getByRole('alert')).toContainText('채팅방 나가기 실패');
  await expect(dialog).toBeVisible();
  await expect(confirmButton).toBeEnabled();
  await expect(page.getByText('마지막 메시지')).toBeVisible();
});

test('채팅방 나가기 성공 시 확인창과 방 카드를 제거한다', async ({ page }) => {
  await seedSignedUpUser(page);
  await installMockRoutes(page, { withChatRoom: true });

  await openChatList(page);
  await page.getByRole('button', { name: '나가기' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '나가기', exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('마지막 메시지')).toBeHidden();
  await expect(page.getByText('아직 대화가 없어요.')).toBeVisible();
});
