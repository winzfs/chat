import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';

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

export async function loadD1ChatMessages(roomId: string): Promise<D1ChatMessage[]> {
  const params = new URLSearchParams({ room_id: roomId });
  const response = await fetch(apiUrl(`/api/chat-messages?${params.toString()}`), { cache: 'no-store' });
  const data = await parseApiResponse<{ messages?: D1ChatMessage[] }>(response, '메시지를 불러오지 못했어요.');
  return data.messages ?? [];
}

export async function sendD1ChatMessage(roomId: string, body: string): Promise<D1ChatMessage> {
  const response = await fetch(apiUrl('/api/chat-messages'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: roomId, body }),
  });

  const data = await parseApiResponse<{ message?: D1ChatMessage }>(response, '메시지를 보내지 못했어요.');
  if (!data.message) throw new Error('저장된 메시지를 확인하지 못했어요.');
  return data.message;
}

export async function sendD1ChatImage(roomId: string, image: File): Promise<D1ChatMessage> {
  const formData = new FormData();
  formData.append('room_id', roomId);
  formData.append('image', image);

  const response = await fetch(apiUrl('/api/chat-images'), {
    method: 'POST',
    body: formData,
  });

  const data = await parseApiResponse<{ message?: D1ChatMessage }>(response, '이미지를 보내지 못했어요.');
  if (!data.message) throw new Error('저장된 이미지를 확인하지 못했어요.');
  return data.message;
}
