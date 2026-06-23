export type ApiErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  balance?: number;
};

export class ApiResponseError extends Error {
  status?: number;
  code?: string;
  balance?: number;

  constructor(message: string, options: { status?: number; code?: string; balance?: number } = {}) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = options.status;
    this.code = options.code;
    this.balance = options.balance;
  }
}

export async function parseApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => null) as (T & ApiErrorPayload) | null;

  if (!response.ok) {
    throw new ApiResponseError(data?.error || data?.message || fallback, {
      status: response.status,
      code: data?.code,
      balance: data?.balance,
    });
  }

  if (!data) {
    throw new ApiResponseError('서버 응답을 읽지 못했어요.', { status: response.status });
  }

  return data;
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiResponseError) {
    const balanceText = typeof error.balance === 'number'
      ? ` 현재 잔액: ${error.balance.toLocaleString('ko-KR')}P`
      : '';
    return `${error.message || fallback}${balanceText}`;
  }

  return error instanceof Error ? error.message : fallback;
}
