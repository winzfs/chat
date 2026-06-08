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
  const response = await fetch('/api/chat-rooms');

  if (!response.ok) {
    return fallbackRooms;
  }

  const data = await response.json() as { rooms?: D1ChatRoom[] };
  return data.rooms && data.rooms.length > 0 ? data.rooms : fallbackRooms;
}
