export type D1ChatMessage = {
  id: string;
  room_id: string;
  sender_nickname: string;
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
  const response = await fetch(`/api/chat-messages?room_id=${encodeURIComponent(roomId)}`, { cache: 'no-store' });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { messages?: D1ChatMessage[] };
  return data.messages ?? [];
}

export async function sendD1ChatMessage(roomId: string, body: string, senderNickname = getProfileNickname()): Promise<D1ChatMessage | null> {
  const response = await fetch('/api/chat-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: roomId, body, sender_nickname: senderNickname }),
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
  formData.append('sender_nickname', getProfileNickname());
  formData.append('image', image);

  const response = await fetch('/api/chat-images', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { message?: D1ChatMessage };
  return data.message ?? null;
}
