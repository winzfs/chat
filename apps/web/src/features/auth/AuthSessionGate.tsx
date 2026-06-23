import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ensureAuthSession } from './authSession';

const legacyProfileIdKey = 'chitchat.profileId.v1';

export function AuthSessionGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const connect = () => {
    setStatus('loading');
    setError('');

    ensureAuthSession()
      .then((session) => {
        localStorage.setItem(legacyProfileIdKey, session.profile_id);
        setStatus('ready');
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : '로그인 세션을 만들지 못했어요.');
        setStatus('error');
      });
  };

  useEffect(connect, []);

  if (status === 'ready') return <>{children}</>;

  return (
    <main className="signup-shell">
      <section className="signup-card" aria-live="polite">
        <p className="home-kicker">플러팅</p>
        <h1>{status === 'loading' ? '안전하게 연결하는 중' : '연결하지 못했어요'}</h1>
        <p className="signup-copy">
          {status === 'loading' ? '사용자 세션을 준비하고 있어요.' : error}
        </p>
        {status === 'error' ? <button type="button" onClick={connect}>다시 연결</button> : null}
      </section>
    </main>
  );
}
