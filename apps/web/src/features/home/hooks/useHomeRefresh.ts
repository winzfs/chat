import { loadD1ChatRooms } from '../api/d1ChatRooms';
import { POLLING_INTERVALS } from '../api/pollingIntervals';
import { usePollingTask } from './usePollingTask';

export function useHomeRefresh(
  activeTab: string,
  isComposeOpen: boolean,
  refreshTalk: () => Promise<void> | void,
  markUnread: () => void,
) {
  usePollingTask(refreshTalk, {
    enabled: activeTab === 'talk' && !isComposeOpen,
    intervalMs: POLLING_INTERVALS.talkPosts,
  });

  usePollingTask(async () => {
    const rooms = await loadD1ChatRooms();
    if (rooms.some((room) => Number(room.unread_count ?? 0) > 0)) markUnread();
  }, {
    enabled: activeTab !== 'chats',
    immediate: true,
    intervalMs: POLLING_INTERVALS.chatRooms,
  });
}
