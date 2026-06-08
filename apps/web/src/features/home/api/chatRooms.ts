import { supabase } from '../../../shared/lib/supabaseClient';

export type ChatRoomRecord = {
  id: string;
  title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
};

export type ChatRoomsResult = {
  rooms: ChatRoomRecord[];
  source: 'db' | 'fallback';
  message: string;
};

const fallbackRooms: ChatRoomRecord[] = [
  {
    id: 'fallback-env',
    title: 'DB 연결 확인 필요',
    last_message: 'Cloudflare 환경변수 또는 Supabase 연결을 확인해야 해요.',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-guide',
    title: 'VITE_SUPABASE 설정 필요',
    last_message: 'VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY가 필요해요.',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export async function fetchChatRooms(): Promise<ChatRoomRecord[]> {
  const result = await fetchChatRoomsWithStatus();
  return result.rooms;
}

export async function fetchChatRoomsWithStatus(): Promise<ChatRoomsResult> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id,title,last_message,last_message_at,created_at')
    .order('last_message_at', { ascending: false })
    .limit(30);

  if (error) {
    return {
      rooms: fallbackRooms,
      source: 'fallback',
      message: error.message,
    };
  }

  if (!data || data.length === 0) {
    return {
      rooms: fallbackRooms,
      source: 'fallback',
      message: 'chat_rooms 테이블에 표시할 데이터가 없어요.',
    };
  }

  return {
    rooms: data as ChatRoomRecord[],
    source: 'db',
    message: `Supabase DB에서 ${data.length}개 채팅방을 불러왔어요.`,
  };
}
