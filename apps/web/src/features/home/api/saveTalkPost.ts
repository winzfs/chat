import { supabase } from '../../../shared/lib/supabaseClient';
import type { TalkPostRecord } from './talkPosts';

const columns = 'id,nickname,age,location,mood,body,tags,likes_count,replies_count,is_online,created_at';

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
      body: fallback.text,
      tags: fallback.tags,
      likes_count: 0,
      replies_count: 0,
      is_online: true,
    })
    .select(columns)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    nickname: data.nickname,
    age: data.age,
    location: data.location,
    mood: data.mood,
    text: data.body,
    tags: data.tags ?? [],
    likes: data.likes_count ?? 0,
    replies: data.replies_count ?? 0,
    online: data.is_online ?? false,
    created_at: data.created_at,
  };
}
