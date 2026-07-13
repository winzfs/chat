import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { type D1ChatRoom } from './api/d1ChatRooms';
import { createD1TalkPost, deleteD1TalkPost, loadD1TalkPosts, type D1TalkPost } from './api/d1TalkPosts';
import { getProfileId } from './api/profileId';
import { defaultProfile, loadMyProfile, saveMyProfile, type MyProfile } from './api/profileStorage';
import { syncProfile } from './api/profileSync';
import { touchRecentUser } from './api/recentUsers';
import { useAndroidBackButton } from './api/useAndroidBackButton';
import { AccountDeletionCard } from './components/AccountDeletionCard';
import { ChatRoomsList } from './components/ChatRoomsList';
import { RecentUsersPanel } from './components/RecentUsersPanel';
import { ProfileSettingsPanel } from './components/ProfileSettingsPanel';
import { TalkComposeModal, type TalkComposeValues } from './components/TalkComposeModal';
import { TalkPanel2 } from './components/TalkPanel2';
import { HomeScreenPollingBridge } from './HomeScreenPollingBridge';
import './HomePage.css';
import './HomeExtra.css';
import './ProfileAvatar.css';
import './components/HomeUiPolish.css';
import './FullScreenRoutes.css';
import './components/HomeModern.css';
import './components/ChatModern.css';

type HomeTab = 'talk' | 'people' | 'chats' | 'settings';
type IconName = 'talk' | 'people' | 'chats' | 'my';
type NoticeTone = 'success' | 'error' | 'info';
type AppNotice = { message: string; tone: NoticeTone };

const tabs: { id: HomeTab; label: string; icon: IconName }[] = [
  { id: 'talk', label: '토크', icon: 'talk' },
  { id: 'people', label: '사람', icon: 'people' },
  { id: 'chats', label: '채팅', icon: 'chats' },
  { id: 'settings', label: '마이', icon: 'my' },
];
const titles: Record<HomeTab, string> = { talk: '오늘 누구와 이야기해볼까요?', people: '최근 접속한 사람', chats: '내 대화', settings: '마이' };
const noticeIcons: Record<NoticeTone, string> = { success: '✓', error: '!', info: 'i' };

function TabIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    talk: <><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 3v-3.4A3.5 3.5 0 0 1 5 10.5z" /><path d="M9 8h6M9 11h4" /></>,
    people: <><path d="M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19" /><circle cx="10" cy="8" r="3" /><path d="M17 11a2.5 2.5 0 1 0 0-5M18 14.5c1.2.4 2 1.5 2 2.8V19" /></>,
    chats: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h8A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13H9l-3.5 2.5V13A2.5 2.5 0 0 1 4 10.5z" /><path d="M17 8h.5A2.5 2.5 0 0 1 20 10.5v4a2.5 2.5 0 0 1-2.5 2.5H16v2l-3-2h-2" /></>,
    my: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  };
  return <svg aria-hidden="true" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9">{paths[name]}</svg>;
}

function hasRoomHash() {
  return window.location.hash.startsWith('#room=');
}

function clearRoomHash() {
  if (hasRoomHash()) history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function HomeScreenNext() {
  const [activeTab, setActiveTab] = useState<HomeTab>('talk');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [posts, setPosts] = useState<D1TalkPost[]>([]);
  const [profile, setProfile] = useState<MyProfile>(defaultProfile);
  const [openRoom, setOpenRoom] = useState<D1ChatRoom | null>(null);
  const [isRoomVisible, setIsRoomVisible] = useState(hasRoomHash());
  const [chatListKey, setChatListKey] = useState(0);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const [hasNewChat, setHasNewChat] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const showNotice = useCallback((message: string, tone: NoticeTone = 'info') => {
    setNotice({ message, tone });
  }, []);

  const refreshTalkPosts = useCallback(async (showError = false) => {
    try {
      setPosts(await loadD1TalkPosts());
    } catch (error) {
      if (showError) showNotice(errorMessage(error, '토크 목록을 불러오지 못했어요.'), 'error');
    }
  }, [showNotice]);

  const changeTab = (tab: HomeTab) => {
    setActiveTab(tab);
    setIsRoomVisible(false);
    if (tab === 'talk') void refreshTalkPosts(true);
    if (tab === 'chats') {
      clearRoomHash();
      setOpenRoom(null);
      setChatListKey((current) => current + 1);
      setHasNewChat(false);
    }
  };

  const closeChatRoom = useCallback(() => {
    clearRoomHash();
    setOpenRoom(null);
    setIsRoomVisible(false);
    setChatListKey((current) => current + 1);
  }, []);

  useAndroidBackButton(useCallback(() => {
    if (isComposeOpen) {
      setIsComposeOpen(false);
      return true;
    }
    if (activeTab === 'chats' && (isRoomVisible || openRoom || hasRoomHash())) {
      closeChatRoom();
      return true;
    }
    if (activeTab !== 'talk') {
      setActiveTab('talk');
      setIsRoomVisible(false);
      void refreshTalkPosts(true);
      return true;
    }
    return false;
  }, [activeTab, closeChatRoom, isComposeOpen, isRoomVisible, openRoom, refreshTalkPosts]));

  useEffect(() => {
    const savedProfile = loadMyProfile();
    setProfile(savedProfile);
    touchRecentUser(savedProfile).catch(() => undefined);
    void refreshTalkPosts(true);
  }, [refreshTalkPosts]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotice('인터넷 연결이 복구됐어요.', 'success');
      touchRecentUser(profile).catch(() => undefined);
      if (activeTab === 'talk') void refreshTalkPosts(false);
      if (activeTab === 'chats') setChatListKey((current) => current + 1);
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotice('인터넷 연결이 끊겼어요. 작성 중인 내용은 그대로 유지돼요.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeTab, profile, refreshTalkPosts, showNotice]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.tone === 'error' ? 5000 : 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const submitTalk = async (values: TalkComposeValues) => {
    try {
      touchRecentUser(profile).catch(() => undefined);
      const result = await createD1TalkPost(values.text, values.mood);
      setPosts((current) => [result.post, ...current]);
      setIsComposeOpen(false);
      setActiveTab('talk');
      if (result.point_reward?.awarded) showNotice('토크 작성 보상으로 100포인트를 받았어요.', 'success');
      else showNotice('토크가 등록됐어요.', 'success');
      void refreshTalkPosts(false);
      return true;
    } catch (error) {
      showNotice(errorMessage(error, '토크를 등록하지 못했어요. 잠시 후 다시 시도해주세요.'), 'error');
      return false;
    }
  };

  const removeTalk = async (id: string) => {
    try {
      await deleteD1TalkPost(id);
      setPosts((current) => current.filter((post) => post.id !== id));
      showNotice('토크를 삭제했어요.', 'success');
    } catch (error) {
      showNotice(errorMessage(error, '토크를 삭제하지 못했어요.'), 'error');
    }
  };

  const saveProfile = async (next: MyProfile) => {
    const previousNickname = profile.nickname;
    await syncProfile(previousNickname, next);
    saveMyProfile(next);
    setProfile(next);
    void refreshTalkPosts(false);
  };

  const openDirectRoom = (room: D1ChatRoom) => {
    setOpenRoom(room);
    setIsRoomVisible(true);
    setHasNewChat(false);
    setActiveTab('chats');
  };

  return (
    <main className={isRoomVisible ? 'app-shell is-chat-room' : 'app-shell'}>
      <a className="skip-link" href="#home-content">본문 바로가기</a>
      {!isOnline && <div className="connection-banner" role="status" aria-live="polite"><span aria-hidden="true" />오프라인 상태예요. 연결되면 자동으로 새 내용을 확인할게요.</div>}
      <HomeScreenPollingBridge activeTab={activeTab} isComposeOpen={isComposeOpen} markUnread={() => setHasNewChat(true)} refreshTalk={() => refreshTalkPosts(false)} />
      <section className="home-screen" id="home-content" aria-labelledby="home-title">
        {!isRoomVisible && <header className="home-header"><div><p className="home-kicker">플러팅</p><h1 id="home-title">{titles[activeTab]}</h1></div><div className="header-profile-chip" aria-label={`내 프로필 ${profile.nickname}`}><span>{profile.nickname?.slice(0, 1) || '나'}</span><small>{profile.nickname || '내 프로필'}</small></div></header>}
        {activeTab === 'talk' && <TalkPanel2 posts={posts} myProfileId={getProfileId()} onDeletePost={removeTalk} onOpenCompose={() => setIsComposeOpen(true)} onOpenRoom={openDirectRoom} />}
        {activeTab === 'people' && <RecentUsersPanel onOpenRoom={openDirectRoom} />}
        {activeTab === 'chats' && <ChatRoomsList key={chatListKey} initialRoom={openRoom} onRoomStateChange={setIsRoomVisible} onRoomClosed={closeChatRoom} />}
        {activeTab === 'settings' && <><ProfileSettingsPanel myProfile={profile} onSave={saveProfile} /><AccountDeletionCard /></>}
      </section>
      {!isRoomVisible && <nav className="bottom-nav" aria-label="주요 메뉴">{tabs.map((tab) => <button aria-current={activeTab === tab.id ? 'page' : undefined} className={activeTab === tab.id ? 'nav-item is-active' : 'nav-item'} key={tab.id} onClick={() => changeTab(tab.id)} type="button"><TabIcon name={tab.icon} /><span className="nav-label">{tab.label}</span>{tab.id === 'chats' && hasNewChat ? <em className="nav-dot" aria-label="새 채팅 알림" /> : null}</button>)}</nav>}
      {notice && <div className={`app-snackbar is-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'} aria-live={notice.tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true"><span aria-hidden="true">{noticeIcons[notice.tone]}</span><p>{notice.message}</p></div>}
      <TalkComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} onSubmit={submitTalk} />
    </main>
  );
}
