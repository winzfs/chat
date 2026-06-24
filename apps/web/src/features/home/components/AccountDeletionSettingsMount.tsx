import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AccountDeletionCard } from './AccountDeletionCard';

function activeSettingsHost() {
  const heading = document.getElementById('home-title');
  if (heading?.textContent?.trim() !== '내 설정') return null;
  return heading.closest<HTMLElement>('.home-screen');
}

export function AccountDeletionSettingsMount() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const updateHost = () => setHost(activeSettingsHost());
    updateHost();

    const observer = new MutationObserver(updateHost);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return host ? createPortal(<AccountDeletionCard />, host) : null;
}
