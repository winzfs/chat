import { supabase } from '../../../shared/lib/supabase';
import type { TalkPost } from '../data/homeMockData';

type TalkPostRow = {
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
};

type CreateTalkPostInput = {
  text: string;
  mood: string;
};

const talkPostColumns = 'id,nickname,age,location,mood,body,tags,likes_count,replies_count,is_online';

export async function fetchTalkPosts(): Promise<TalkPost[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('talk_posts')
    .select(talkPostColumns)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTalkPostRow);
}

export async function createTalkPost(input: CreateTalkPostInput): Promise<TalkPost | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('talk_posts')
    .insert({
      nickname: '나',
      age: 25,
      location: '내 주변',
      mood: input.mood,
      body: input.text,
      tags: ['방금작성', input.mood.replaceAll(' ', '')],
      likes_count: 0,
      replies_count: 0,
      is_online: true,
    })
    .select(talkPostColumns)
    .single();

  if (error) {
    throw error;
  }

  return mapTalkPostRow(data);
}

function mapTalkPostRow(row: TalkPostRow): TalkPost {
  return {
    id: row.id,
    nickname: row.nickname,
    age: row.age ?? 0,
    location: row.location ?? '내 주변',
    mood: row.mood,
    text: row.body,
    tags: row.tags ?? [],
    likes: row.likes_count ?? 0,
    replies: row.replies_count ?? 0,
    online: row.is_online ?? false,
  };
}
