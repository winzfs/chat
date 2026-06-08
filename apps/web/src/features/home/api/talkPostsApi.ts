import { supabase } from '../../../shared/lib/supabase';
import type { TalkPost } from '../data/homeMockData';

type TalkPostRow = {
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
};

type CreateTalkPostInput = {
  text: string;
  mood: string;
};

export async function fetchTalkPosts(): Promise<TalkPost[]> {
  const { data, error } = await supabase
    .from('talk_posts')
    .select('id,nickname,age,location,mood,text,tags,likes,replies,online')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTalkPostRow);
}

export async function createTalkPost(input: CreateTalkPostInput): Promise<TalkPost> {
  const { data, error } = await supabase
    .from('talk_posts')
    .insert({
      nickname: '나',
      age: 25,
      location: '내 주변',
      mood: input.mood,
      text: input.text,
      tags: ['방금작성', input.mood.replaceAll(' ', '')],
      likes: 0,
      replies: 0,
      online: true,
    })
    .select('id,nickname,age,location,mood,text,tags,likes,replies,online')
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
    text: row.text,
    tags: row.tags ?? [],
    likes: row.likes,
    replies: row.replies,
    online: row.online,
  };
}
