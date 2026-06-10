import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';
import type { MyProfile } from './profileStorage';

export type D1TalkPost = {
  id: string;
  profile_id?: string | null;
  avatar_url?: string | null;
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

export async function loadD1TalkPosts(): Promise<D1TalkPost[]> {
  const response = await fetch(apiUrl('/api/talk-posts'), { cache: 'no-store' });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { posts?: D1TalkPost[] };
  return data.posts ?? [];
}

export async function createD1TalkPost(text: string, mood: string, profile?: MyProfile): Promise<D1TalkPost | null> {
  const profileId = getProfileId();
  const response = await fetch(apiUrl('/api/talk-posts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: profileId,
      avatar_url: profile?.avatar_url,
      text,
      mood,
      nickname: profile?.nickname,
      age: profile?.age,
      location: profile?.location,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { post: D1TalkPost };
  return data.post;
}

export async function deleteD1TalkPost(id: string): Promise<boolean> {
  const response = await fetch(apiUrl(`/api/talk-posts?id=${encodeURIComponent(id)}`), {
    method: 'DELETE',
  });

  return response.ok;
}
