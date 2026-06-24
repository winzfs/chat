import type { Page, Route } from '@playwright/test';
import { E2E_PROFILE_ID } from './sessionSeed';

type MockRouteOptions = {
  chatMessageStatus?: number;
  directChatDelayMs?: number;
  profileSyncStatus?: number;
  talkCreateStatus?: number;
  withPeerTalk?: boolean;
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
      await reply(route, {
        posts: options.withPeerTalk ? [{
          id: 'peer-talk',
          profile_id: 'peer-profile',
          nickname: '상대유저',
          age: 27,
          location: '서울특별시',
          mood: '가벼운 수다',
          text: '대화할 사람을 찾고 있어요',
          tags: [],
          likes: 0,
          replies: 0,
          online: true,
          created_at: '2026-06-24T00:00:00.000Z',
        }] : [],
      });
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

    if (path === '/api/chat-rooms' && method === 'POST') {
      if (options.directChatDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.directChatDelayMs));
      }
      await reply(route, {
        id: 'direct-room',
        title: '상대유저님과의 대화',
        last_message: null,
        last_message_at: null,
        created_at: '2026-06-24T00:00:00.000Z',
        unread_count: 0,
        participant_a_id: E2E_PROFILE_ID,
        participant_a_nickname: '테스트유저',
        participant_b_id: 'peer-profile',
        participant_b_nickname: '상대유저',
      });
      return;
    }

    if (path === '/api/chat-rooms' && method === 'GET') {
      await reply(route, { rooms: [] });
      return;
    }

    if (path === '/api/chat-messages' && method === 'GET') {
      await reply(route, { messages: [] });
      return;
    }

    if (path === '/api/chat-messages' && method === 'POST') {
      const status = options.chatMessageStatus ?? 200;
      await reply(route, status === 200 ? {
        message: {
          id: 'message-e2e',
          room_id: 'direct-room',
          sender_nickname: '테스트유저',
          sender_profile_id: E2E_PROFILE_ID,
          message_type: 'text',
          body: '테스트 메시지',
          image_key: null,
          image_url: null,
          created_at: '2026-06-24T00:00:00.000Z',
        },
      } : { error: '메시지 전송 실패' }, status);
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
