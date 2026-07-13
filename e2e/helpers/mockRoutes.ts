import type { Page, Route } from '@playwright/test';
import { E2E_PROFILE_ID } from './sessionSeed';

type MockRouteOptions = {
  accountDeleteStatus?: number;
  chatMessageStatus?: number;
  directChatDelayMs?: number;
  leaveRoomStatus?: number;
  myRoomLoadStatus?: number;
  myRoomSaveStatus?: number;
  pointClaimStatus?: number;
  pointStatusStatus?: number;
  profileImageStatus?: number;
  profileSyncStatus?: number;
  talkCreateStatus?: number;
  withChatRoom?: boolean;
  withPeerTalk?: boolean;
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

const chatRoom = {
  id: 'direct-room',
  title: '상대유저님과의 대화',
  last_message: '마지막 메시지',
  last_message_at: '2026-06-24T00:00:00.000Z',
  created_at: '2026-06-24T00:00:00.000Z',
  unread_count: 0,
  participant_a_id: E2E_PROFILE_ID,
  participant_a_nickname: '테스트유저',
  participant_b_id: 'peer-profile',
  participant_b_nickname: '상대유저',
};

const myRoom = {
  profile_id: E2E_PROFILE_ID,
  wallpaper: 'peach',
  floor: 'cream',
  items: [],
  updated_at: '2026-06-24T00:00:00.000Z',
};

const pointStatus = {
  balance: 0,
  today: '2026-06-25',
  attendance_claimed: false,
  talk_reward_claimed: false,
  ad_reward_claimed: false,
  history: [],
};

export async function installMockRoutes(page: Page, options: MockRouteOptions = {}) {
  let roomVisible = Boolean(options.withChatRoom);
  let authProfileId = E2E_PROFILE_ID;
  let authToken = 'e2e-session';

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
        ? { profile_id: authProfileId, token: authToken }
        : { profile_id: authProfileId });
      return;
    }

    if (path === '/api/account' && method === 'DELETE') {
      const status = options.accountDeleteStatus ?? 200;
      if (status === 200) {
        authProfileId = 'e2e-fresh-profile';
        authToken = 'e2e-fresh-session';
      }
      await reply(route, status === 200 ? { ok: true } : { error: '회원 탈퇴 처리 실패' }, status);
      return;
    }

    if (path === '/api/profile-sync' && method === 'POST') {
      const status = options.profileSyncStatus ?? 200;
      await reply(route, status === 200 ? { ok: true } : { error: '프로필 저장 실패' }, status);
      return;
    }

    if (path === '/api/profile-image' && method === 'POST') {
      const status = options.profileImageStatus ?? 200;
      await reply(route, status === 200 ? { avatar_url: '/avatars/e2e-avatar.jpg' } : { error: '프로필 사진 업로드 실패' }, status);
      return;
    }

    if (path === '/api/profile-image' && method === 'DELETE') {
      await reply(route, { ok: true });
      return;
    }

    if (path === '/api/points' && method === 'GET') {
      const status = options.pointStatusStatus ?? 200;
      await reply(route, status === 200 ? pointStatus : { error: '포인트 정보를 불러오지 못했어요.' }, status);
      return;
    }

    if (path === '/api/points' && method === 'POST') {
      const status = options.pointClaimStatus ?? 200;
      await reply(route, status === 200 ? {
        awarded: true,
        amount: 100,
        balance: 100,
        today: '2026-06-25',
        message: '100P를 받았어요.',
      } : { error: '포인트 보상 실패' }, status);
      return;
    }

    if (path === '/api/my-room' && method === 'GET') {
      const status = options.myRoomLoadStatus ?? 200;
      await reply(route, status === 200 ? { room: myRoom } : { error: '마이룸을 불러오지 못했어요.' }, status);
      return;
    }

    if (path === '/api/my-room' && method === 'POST') {
      const status = options.myRoomSaveStatus ?? 200;
      await reply(route, status === 200 ? { room: myRoom } : { error: '마이룸 저장 실패' }, status);
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
        point_reward: { awarded: false, amount: 0, balance: 0 },
      } : { error: '토크 등록 실패' }, status);
      return;
    }

    if (path === '/api/chat-rooms' && method === 'POST') {
      if (options.directChatDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.directChatDelayMs));
      }
      roomVisible = true;
      await reply(route, chatRoom);
      return;
    }

    if (path === '/api/chat-rooms' && method === 'GET') {
      await reply(route, { rooms: roomVisible ? [chatRoom] : [] });
      return;
    }

    if (path === '/api/chat-room-leave' && method === 'POST') {
      const status = options.leaveRoomStatus ?? 200;
      if (status === 200) roomVisible = false;
      await reply(route, status === 200 ? { ok: true } : { error: '채팅방 나가기 실패' }, status);
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
