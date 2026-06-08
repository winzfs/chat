import { supabase } from '../../../shared/lib/supabase';
import { talkPosts } from '../data/homeMockData';

export type TalkPost = (typeof talkPosts)[number];
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
  likes: number;
  replies: number;
  online: boolean;
};

export async function fetchTalkPosts(): Promise<TalkPost[]> {
  if (!supabase) {
    return talkPosts;
  }

  const { data, error } = await supabase
    .from('talk_posts')
    .select('id, nickname, age, location, mood, text, tags, likes, replies, online')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error(error);
    return talkPosts;
  }

  return data.map(mapTalkPostRow);
}

export async function createTalkPost(input: CreateTalkPostInput): Promise<TalkPost | null> {
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
    .select('id, nickname, age, location, mood, text, tags, likes, replies, online')
    .single();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return mapTalkPostRow(data);
}

function mapTalkPostRow(row: TalkPostRow): TalkPost {
  return {
    id: Number.parseInt(row.id.replace(/-/g, '').slice(0, 12), 16),
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
