import { supabase } from '../../../shared/lib/supabaseClient';

export type ChatRoomRecord = {
  id: string;
  title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
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
  if (!supabase) {
    return fallbackRooms;
  }

  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id,title,last_message,last_message_at,created_at')
    .order('last_message_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return fallbackRooms;
  }

  if (!data || data.length === 0) {
    return fallbackRooms;
  }

  return data as ChatRoomRecord[];
}
