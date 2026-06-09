import type { D1ChatRoom } from './d1ChatRooms';
import { getProfileId } from './profileId';

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
  const response = await fetch('/api/user-blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocker_id: getProfileId(),
      blocked_id: peerId,
      blocked_nickname: peerNickname,
    }),
  });

  return response.ok;
}

export async function reportUser(peerId: string, peerNickname: string, roomId?: string, reason = '채팅 신고') {
  const response = await fetch('/api/reports', {
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
}