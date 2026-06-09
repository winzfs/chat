import { useEffect } from 'react';
import { loadD1ChatMessages, type D1ChatMessage } from './d1ChatMessages';
import { POLLING_INTERVALS } from './pollingIntervals';

export function useMessagePolling(roomId: string, onUpdate: (messages: D1ChatMessage[]) => void) {
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      loadD1ChatMessages(roomId).then(onUpdate);
    }, POLLING_INTERVALS.chatMessages);

    return () => window.clearInterval(timer);
  }, [onUpdate, roomId]);
}
