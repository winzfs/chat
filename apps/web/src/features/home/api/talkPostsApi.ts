import { supabase } from '../../../shared/lib/supabase';
import { talkPosts, type TalkPost } from '../data/homeMockData';

export type CreateTalkPostInput = {
  text: string;
  mood: string;
};

type TalkPostRow = {
  id: string;
  nickname: string;
  age: number | null;
  location: string | null;
  mood: string;
  text: string;
  tags: string[] | null;
  likes: number | null;
  replies: number | null;
  online: boolean | null;
};

const talkPostColumns = 'id,nickname,age,location,mood,text,tags,likes,replies,online';

export async function fetchTalkPosts(): Promise<TalkPost[]> {
  if (!supabase) {
    return talkPosts;
  }

  const { data, error } = await supabase
    .from('talk_posts')
    .select(talkPostColumns)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return talkPosts;
  }

  return (data ?? []).map(mapTalkPostRow);
}

export async function createTalkPost(input: CreateTalkPostInput): Promise<TalkPost> {
  if (!supabase) {
    return createLocalTalkPost(input);
  }

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
    .select(talkPostColumns)
    .single();

  if (error || !data) {
    console.error(error);
    return createLocalTalkPost(input);
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
    likes: row.likes ?? 0,
    replies: row.replies ?? 0,
    online: row.online ?? false,
  };
}

function createLocalTalkPost(input: CreateTalkPostInput): TalkPost {
  return {
    id: Date.now(),
    nickname: '나',
    age: 25,
    location: '내 주변',
    mood: input.mood,
    text: input.text,
    tags: ['방금작성', input.mood.replaceAll(' ', '')],
    likes: 0,
    replies: 0,
    online: true,
  };
}
