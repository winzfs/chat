import { apiUrl } from '../home/api/apiBase';

export type AuthSession = {
  profile_id: string;
  token: string;
};

const sessionKey = 'chitchat.authSession.v1';
let pendingSession: Promise<AuthSession> | null = null;

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.profile_id || !parsed.token) return null;

    return {
      profile_id: parsed.profile_id,
      token: parsed.token,
    };
  } catch {
    return null;
  }
}

function saveAuthSession(session: AuthSession) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

async function isValidSession(session: AuthSession) {
  let response: Response;

  try {
    response = await fetch(apiUrl('/api/auth/session'), {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.token}` },
      cache: 'no-store',
    });
  } catch {
    throw new Error('네트워크 연결을 확인해주세요. 기존 로그인 정보는 유지했어요.');
  }

  if (response.status === 401) return false;

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || '로그인 세션을 확인하지 못했어요.');
  }

  const data = await response.json().catch(() => null) as { profile_id?: string } | null;
  return data?.profile_id === session.profile_id;
}

async function createAuthSession() {
  const response = await fetch(apiUrl('/api/auth/session'), {
    method: 'POST',
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || '로그인 세션을 만들지 못했어요.');
  }

  const session = await response.json() as AuthSession;
  if (!session.profile_id || !session.token) {
    throw new Error('로그인 세션 응답이 올바르지 않아요.');
  }

  saveAuthSession(session);
  return session;
}

export async function ensureAuthSession() {
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const existing = loadAuthSession();
    if (existing) {
      const valid = await isValidSession(existing);
      if (valid) return existing;
      clearAuthSession();
    }

    return createAuthSession();
  })();

  try {
    return await pendingSession;
  } finally {
    pendingSession = null;
  }
}

export function getAuthHeaders() {
  const session = loadAuthSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export function clearAuthSession() {
  localStorage.removeItem(sessionKey);
}
