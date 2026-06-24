import { POLLING_INTERVALS } from '../api/pollingIntervals';
import { usePollingTask } from './usePollingTask';

export function useChatRoomsPolling(enabled: boolean, refresh: () => Promise<void> | void) {
  usePollingTask(refresh, {
    enabled,
    intervalMs: POLLING_INTERVALS.chatRooms,
  });
}
