import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import { getProfileId } from './profileId';

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

export type D1TalkPostCreateResult = {
  post: D1TalkPost;
  point_reward?: {
    awarded: boolean;
    amount: number;
    balance: number;
  };
};

export async function loadD1TalkPosts(): Promise<D1TalkPost[]> {
  const response = await fetch(apiUrl('/api/talk-posts'), { cache: 'no-store' });
  const data = await parseApiResponse<{ posts?: D1TalkPost[] }>(response, '토크 목록을 불러오지 못했어요.');
  return data.posts ?? [];
}

export async function createD1TalkPost(text: string, mood: string): Promise<D1TalkPostCreateResult> {
  const response = await fetch(apiUrl('/api/talk-posts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: getProfileId(),
      text,
      mood,
    }),
  });

  return parseApiResponse<D1TalkPostCreateResult>(response, '토크를 등록하지 못했어요.');
}

export async function deleteD1TalkPost(id: string): Promise<void> {
  const params = new URLSearchParams({ id, profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/talk-posts?${params.toString()}`), {
    method: 'DELETE',
  });

  await parseApiResponse<{ ok: boolean }>(response, '토크를 삭제하지 못했어요.');
}
