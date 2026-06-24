import { loadD1ChatMessages, type D1ChatMessage } from './d1ChatMessages';
import { POLLING_INTERVALS } from './pollingIntervals';
import { usePollingTask } from '../hooks/usePollingTask';

export function useMessagePolling(roomId: string, onUpdate: (messages: D1ChatMessage[]) => void) {
  usePollingTask(
    async () => {
      onUpdate(await loadD1ChatMessages(roomId));
    },
    {
      enabled: Boolean(roomId),
      intervalMs: POLLING_INTERVALS.chatMessages,
    },
  );
}
