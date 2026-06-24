import { useHomeRefresh } from './hooks/useHomeRefresh';

type HomeScreenPollingBridgeProps = {
  activeTab: string;
  isComposeOpen: boolean;
  markUnread: () => void;
  refreshTalk: () => Promise<void> | void;
};

export function HomeScreenPollingBridge({ activeTab, isComposeOpen, markUnread, refreshTalk }: HomeScreenPollingBridgeProps) {
  useHomeRefresh(activeTab, isComposeOpen, refreshTalk, markUnread);
  return null;
}
