import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';
import { loadMyProfile } from './profileStorage';

export type D1ChatRoom = {
  id: string;
  title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  unread_count?: number | null;
  direct_key?: string | null;
  participant_a_id?: string | null;
  participant_a_nickname?: string | null;
  participant_b_id?: string | null;
  participant_b_nickname?: string | null;
  peer_avatar_url?: string | null;
};

function hiddenRoomsKey() {
  return `chitchat.hiddenRooms.${getProfileId()}.v1`;
}

function clearLegacyHiddenRoom(roomId: string) {
  try {
    const hidden = new Set(JSON.parse(localStorage.getItem(hiddenRoomsKey()) || '[]') as string[]);
    if (!hidden.delete(roomId)) return;
    localStorage.setItem(hiddenRoomsKey(), JSON.stringify([...hidden]));
  } catch {
    localStorage.removeItem(hiddenRoomsKey());
  }
}

function resolveRoomTitle(room: D1ChatRoom): D1ChatRoom {
  const profile = loadMyProfile();
  const myId = getProfileId();
  const myNickname = profile.nickname;
  const isA = room.participant_a_id === myId || room.participant_a_nickname === myNickname;
  const isB = room.participant_b_id === myId || room.participant_b_nickname === myNickname;
  const normalized = { ...room, unread_count: Number(room.unread_count ?? 0) };

  if (isA && room.participant_b_nickname) {
    return { ...normalized, title: `${room.participant_b_nickname}님과의 대화` };
  }

  if (isB && room.participant_a_nickname) {
    return { ...normalized, title: `${room.participant_a_nickname}님과의 대화` };
  }

  if (room.title === `${myNickname}님과의 대화` || room.title === '새 채팅방') {
    return { ...normalized, title: '상대방과의 대화' };
  }

  return normalized;
}

export async function loadD1ChatRooms(): Promise<D1ChatRoom[]> {
  const profile = loadMyProfile();
  const params = new URLSearchParams({
    profile_id: getProfileId(),
    viewer_nickname: profile.nickname,
  });

  const response = await fetch(apiUrl(`/api/chat-rooms?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { rooms?: D1ChatRoom[] };
  return data.rooms && data.rooms.length > 0
    ? data.rooms.map(resolveRoomTitle)
    : [];
}

export async function createD1ChatRoom(title: string): Promise<D1ChatRoom | null> {
  const response = await fetch(apiUrl('/api/chat-rooms'), {
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

  clearLegacyHiddenRoom(data.id);
  return resolveRoomTitle(data);
}

export async function openDirectD1ChatRoom(peerNickname: string, peerId?: string): Promise<D1ChatRoom | null> {
  const response = await fetch(apiUrl('/api/chat-rooms'), {
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

  if (!data.id) {
    return null;
  }

  clearLegacyHiddenRoom(data.id);
  return resolveRoomTitle(data);
}

export async function leaveD1ChatRoom(id: string): Promise<boolean> {
  const response = await fetch(apiUrl('/api/chat-room-leave'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: id, profile_id: getProfileId(), nickname: loadMyProfile().nickname }),
  });

  return response.ok;
}
