import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';

export async function deleteAccount() {
  const response = await fetch(apiUrl('/api/account'), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  return parseApiResponse<{ ok?: boolean }>(response, '회원 탈퇴를 처리하지 못했어요.');
}
