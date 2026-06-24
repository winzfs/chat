import type { Page, Route } from '@playwright/test';
import { E2E_PROFILE_ID } from './sessionSeed';

type MockRouteOptions = {
  profileSyncStatus?: number;
  talkCreateStatus?: number;
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installMockRoutes(page: Page, options: MockRouteOptions = {}) {
  page.on('pageerror', (error) => {
    console.error(`[browser pageerror] ${error.stack || error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      console.error(`[browser ${message.type()}] ${message.text()}`);
    }
  });

  page.on('requestfailed', (request) => {
    console.error(`[browser requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path === '/api/auth/session') {
      await reply(route, method === 'POST'
        ? { profile_id: E2E_PROFILE_ID, token: 'e2e-session' }
        : { profile_id: E2E_PROFILE_ID });
      return;
    }

    if (path === '/api/profile-sync' && method === 'POST') {
      const status = options.profileSyncStatus ?? 200;
      await reply(route, status === 200 ? { ok: true } : { error: '프로필 저장 실패' }, status);
      return;
    }

    if (path === '/api/talk-posts' && method === 'GET') {
      await reply(route, { posts: [] });
      return;
    }

    if (path === '/api/talk-posts' && method === 'POST') {
      const status = options.talkCreateStatus ?? 200;
      await reply(route, status === 200 ? {
        post: {
          id: 'talk-e2e',
          profile_id: E2E_PROFILE_ID,
          nickname: '테스트유저',
          age: 25,
          location: '서울특별시',
          mood: '가벼운 수다',
          text: '테스트 토크',
          tags: [],
          likes: 0,
          replies: 0,
          online: true,
          created_at: '2026-06-24T00:00:00.000Z',
        },
      } : { error: '토크 등록 실패' }, status);
      return;
    }

    if (path === '/api/chat-rooms' && method === 'GET') {
      await reply(route, { rooms: [] });
      return;
    }

    if (path === '/api/recent-users' && method === 'GET') {
      await reply(route, { users: [] });
      return;
    }

    if (path === '/api/recent-users' && method === 'POST') {
      await reply(route, { ok: true });
      return;
    }

    await reply(route, { ok: true });
  });
}
