import { useEffect } from 'react';
import { loadD1ChatMessages, type D1ChatMessage } from './d1ChatMessages';
import { POLLING_INTERVALS } from './pollingIntervals';

export function useMessagePolling(roomId: string, onUpdate: (messages: D1ChatMessage[]) => void) {
  useEffect(() => {
    let cancelled = false;

    const timer = window.setInterval(() => {
      if (document.hidden) return;

      loadD1ChatMessages(roomId)
        .then((messages) => {
          if (!cancelled) onUpdate(messages);
        })
        .catch(() => {
          // Keep the current messages and retry on the next polling cycle.
        });
    }, POLLING_INTERVALS.chatMessages);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onUpdate, roomId]);
}
