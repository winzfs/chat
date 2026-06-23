import { apiUrl } from '../home/api/apiBase';

export type AuthSession = {
  profile_id: string;
  token: string;
};

const sessionKey = 'chitchat.authSession.v1';

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

export async function ensureAuthSession() {
  const existing = loadAuthSession();
  if (existing) return existing;

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

export function getAuthHeaders() {
  const session = loadAuthSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export function clearAuthSession() {
  localStorage.removeItem(sessionKey);
}
