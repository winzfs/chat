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
    id: 'demo-1',
    title: '지우',
    last_message: '퇴근하고 달달한 커피 마시러 갈 사람 있어요?',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: '민준',
    last_message: '잔잔한 영화 추천받아요.',
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
