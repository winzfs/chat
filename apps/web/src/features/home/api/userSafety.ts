import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import type { D1ChatRoom } from './d1ChatRooms';
import { getProfileId } from './profileId';

export type BlockedUser = {
  blocked_id: string;
  blocked_nickname?: string | null;
  created_at?: string | null;
};

export function getPeerFromRoom(room: D1ChatRoom) {
  const myId = getProfileId();

  if (room.participant_a_id === myId && room.participant_b_id) {
    return { id: room.participant_b_id, nickname: room.participant_b_nickname || '상대방' };
  }

  if (room.participant_b_id === myId && room.participant_a_id) {
    return { id: room.participant_a_id, nickname: room.participant_a_nickname || '상대방' };
  }

  return null;
}

export async function blockUser(peerId: string, peerNickname: string) {
  try {
    const response = await fetch(apiUrl('/api/user-blocks'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocker_id: getProfileId(),
        blocked_id: peerId,
        blocked_nickname: peerNickname,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function listBlockedUsers() {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/user-blocks?${params.toString()}`), { cache: 'no-store' });
  const data = await parseApiResponse<{ blocks?: BlockedUser[] }>(response, '차단 목록을 불러오지 못했어요.');
  return data.blocks ?? [];
}

export async function unblockUser(peerId: string) {
  try {
    const params = new URLSearchParams({ blocker_id: getProfileId(), blocked_id: peerId });
    const response = await fetch(apiUrl(`/api/user-blocks?${params.toString()}`), { method: 'DELETE' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function reportUser(peerId: string, peerNickname: string, roomId?: string, reason = '채팅 신고') {
  try {
    const response = await fetch(apiUrl('/api/reports'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter_id: getProfileId(),
        reported_id: peerId,
        reported_nickname: peerNickname,
        room_id: roomId,
        reason,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
