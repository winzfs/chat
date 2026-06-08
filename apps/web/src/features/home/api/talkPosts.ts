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

const columns = 'id,nickname,age,location,mood,text,tags,likes,replies,online,created_at';

export async function fetchTalkPosts() {
  const { data, error } = await supabase.from('talk_posts').select(columns).order('created_at', { ascending: false }).limit(30);

  if (error) throw error;

  return data as TalkPostRecord[];
}
