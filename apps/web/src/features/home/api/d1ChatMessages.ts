import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';

export type D1ChatMessage = {
  id: string;
  room_id: string;
  sender_nickname: string;
  sender_profile_id?: string | null;
  message_type: 'text' | 'image';
  body: string | null;
  image_key: string | null;
  image_url: string | null;
  created_at: string;
};

function getProfileNickname() {
  try {
    const raw = localStorage.getItem('chitchat.myProfile.v1');
    const profile = raw ? JSON.parse(raw) as { nickname?: string } : null;
    return profile?.nickname || '익명';
  } catch {
    return '익명';
  }
}

export async function loadD1ChatMessages(roomId: string): Promise<D1ChatMessage[]> {
  const params = new URLSearchParams({ room_id: roomId, profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/chat-messages?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { messages?: D1ChatMessage[] };
  return data.messages ?? [];
}

export async function sendD1ChatMessage(roomId: string, body: string, senderNickname = getProfileNickname()): Promise<D1ChatMessage | null> {
  const response = await fetch(apiUrl('/api/chat-messages'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: roomId, body, sender_nickname: senderNickname, profile_id: getProfileId() }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { message?: D1ChatMessage };
  return data.message ?? null;
}

export async function sendD1ChatImage(roomId: string, image: File): Promise<D1ChatMessage | null> {
  const formData = new FormData();
  formData.append('room_id', roomId);
  formData.append('profile_id', getProfileId());
  formData.append('sender_nickname', getProfileNickname());
  formData.append('image', image);

  const response = await fetch(apiUrl('/api/chat-images'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { message?: D1ChatMessage };
  return data.message ?? null;
}
