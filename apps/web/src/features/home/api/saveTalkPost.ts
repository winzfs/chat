import { supabase } from '../../../shared/lib/supabaseClient';
import type { TalkPostRecord } from './talkPosts';

const columns = 'id,nickname,age,location,mood,text,tags,likes,replies,online,created_at';

export async function saveTalkPost(text: string, mood: string): Promise<TalkPostRecord> {
  const fallback: TalkPostRecord = {
    id: String(Date.now()),
    nickname: '나',
    age: 25,
    location: '내 주변',
    mood,
    text,
    tags: ['방금작성', mood.replaceAll(' ', '')],
    likes: 0,
    replies: 0,
    online: true,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from('talk_posts')
    .insert({
      nickname: fallback.nickname,
      age: fallback.age,
      location: fallback.location,
      mood: fallback.mood,
      text: fallback.text,
      tags: fallback.tags,
      likes: 0,
      replies: 0,
      online: true,
    })
    .select(columns)
    .single();

  if (error) {
    console.error(error);
    return fallback;
  }

  return data as TalkPostRecord;
}
