import { supabase } from '../../../shared/lib/supabaseClient';

export type TalkPostRecord = {
  id: string;
  nickname: string;
  age: number | null;
  location: string | null;
  mood: string;
  text: string;
  tags: string[];
  likes: number;
  replies: number;
  online: boolean;
  created_at: string;
};

type Row = {
  id: string;
  nickname: string;
  age: number | null;
  location: string | null;
  mood: string;
  body: string;
  tags: string[] | null;
  likes_count: number | null;
  replies_count: number | null;
  is_online: boolean | null;
  created_at: string;
};

const columns = 'id,nickname,age,location,mood,body,tags,likes_count,replies_count,is_online,created_at';

export async function fetchTalkPosts(): Promise<TalkPostRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.from('talk_posts').select(columns).order('created_at', { ascending: false }).limit(30);

  if (error) throw error;

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    nickname: row.nickname,
    age: row.age,
    location: row.location,
    mood: row.mood,
    text: row.body,
    tags: row.tags ?? [],
    likes: row.likes_count ?? 0,
    replies: row.replies_count ?? 0,
    online: row.is_online ?? false,
    created_at: row.created_at,
  }));
}
