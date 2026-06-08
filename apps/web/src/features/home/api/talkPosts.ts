import { supabase } from '../../../shared/lib/supabaseClient';
import { talkPosts } from '../data/homeMockData';

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

const fallbackPosts: TalkPostRecord[] = talkPosts.map((post) => ({
  ...post,
  id: String(post.id),
  created_at: new Date().toISOString(),
}));

export async function fetchTalkPosts(): Promise<TalkPostRecord[]> {
  if (!supabase) {
    return fallbackPosts;
  }

  const { data, error } = await supabase
    .from('talk_posts')
    .select(columns)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return fallbackPosts;
  }

  return data as TalkPostRecord[];
}
