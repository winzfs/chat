export type ApiErrorPayload = {
  error?: string;
  balance?: number;
};

export async function parseApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => null) as (T & ApiErrorPayload) | null;

  if (!response.ok) {
    const error = new Error(data?.error || fallback) as Error & { balance?: number };
    error.balance = data?.balance;
    throw error;
  }

  if (!data) {
    throw new Error('서버 응답을 읽지 못했어요.');
  }

  return data;
}
