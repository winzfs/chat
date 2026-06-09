import { getProfileId } from './profileId';
import { loadMyProfile } from './profileStorage';

export type D1ChatRoom = {
  id: string;
  title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

const fallbackRooms: D1ChatRoom[] = [
  {
    id: 'd1-not-ready',
    title: 'D1 바인딩 확인 필요',
    last_message: 'Cloudflare Pages 설정에서 D1 DB 바인딩 이름을 DB로 연결해야 해요.',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export async function loadD1ChatRooms(): Promise<D1ChatRoom[]> {
  const profile = loadMyProfile();
  const params = new URLSearchParams({
    profile_id: getProfileId(),
    viewer_nickname: profile.nickname,
  });

  const response = await fetch(`/api/chat-rooms?${params.toString()}`, { cache: 'no-store' });

  if (!response.ok) {
    return fallbackRooms;
  }

  const data = await response.json() as { rooms?: D1ChatRoom[] };
  return data.rooms && data.rooms.length > 0 ? data.rooms : fallbackRooms;
}

export async function createD1ChatRoom(title: string): Promise<D1ChatRoom | null> {
  const response = await fetch('/api/chat-rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, profile_id: getProfileId(), viewer_nickname: loadMyProfile().nickname }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as D1ChatRoom;

  if (!data.id) {
    return null;
  }

  return data;
}

export async function openDirectD1ChatRoom(peerNickname: string, peerId?: string): Promise<D1ChatRoom | null> {
  const response = await fetch('/api/chat-rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: getProfileId(),
      viewer_nickname: loadMyProfile().nickname,
      peer_id: peerId,
      peer_nickname: peerNickname,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as D1ChatRoom;
  return data.id ? data : null;
}

export async function leaveD1ChatRoom(id: string): Promise<boolean> {
  const response = await fetch(`/api/chat-rooms?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  return response.ok;
}
