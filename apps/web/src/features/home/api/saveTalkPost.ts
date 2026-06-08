import { supabase } from '../../../shared/lib/supabaseClient';
import type { TalkPostRecord } from './talkPosts';

const columns = 'id,nickname,age,location,mood,text,tags,likes,replies,online,created_at';

export async function saveTalkPost(text: string, mood: string) {
  const payload = {
    nickname: '나',
    age: 25,
    location: '내 주변',
    mood,
    text,
    tags: ['방금작성', mood.replaceAll(' ', '')],
    likes: 0,
    replies: 0,
    online: true,
  };

  const query = supabase.from('talk_posts');
  const result = await query['insert'](payload).select(columns).single();

  if (result.error) throw result.error;

  return result.data as TalkPostRecord;
}
