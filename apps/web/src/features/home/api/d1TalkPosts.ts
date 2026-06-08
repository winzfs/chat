import { talkPosts } from '../data/homeMockData';

export type D1TalkPost = {
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

const fallbackPosts: D1TalkPost[] = talkPosts.map((post) => ({
  ...post,
  id: String(post.id),
  created_at: new Date().toISOString(),
}));

export async function loadD1TalkPosts(): Promise<D1TalkPost[]> {
  const response = await fetch('/api/talk-posts');

  if (!response.ok) {
    return fallbackPosts;
  }

  const data = await response.json() as { posts?: D1TalkPost[] };
  return data.posts && data.posts.length > 0 ? data.posts : fallbackPosts;
}

export async function createD1TalkPost(text: string, mood: string): Promise<D1TalkPost> {
  const response = await fetch('/api/talk-posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mood }),
  });

  if (!response.ok) {
    return {
      id: String(Date.now()),
      nickname: '나',
      age: 25,
      location: '내 주변',
      mood,
      text,
      tags: ['방금작성', mood.split(' ').join('')],
      likes: 0,
      replies: 0,
      online: true,
      created_at: new Date().toISOString(),
    };
  }

  const data = await response.json() as { post: D1TalkPost };
  return data.post;
}
