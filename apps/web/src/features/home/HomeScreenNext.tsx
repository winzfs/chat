import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../../shared/components/Card';
import { loadD1ChatRooms, type D1ChatRoom } from './api/d1ChatRooms';
import { createD1TalkPost, deleteD1TalkPost, loadD1TalkPosts, type D1TalkPost } from './api/d1TalkPosts';
import { POLLING_INTERVALS } from './api/pollingIntervals';
import { defaultProfile, loadMyProfile, saveMyProfile, type MyProfile } from './api/profileStorage';
import { syncProfile } from './api/profileSync';
import { touchRecentUser } from './api/recentUsers';
import { useAndroidBackButton } from './api/useAndroidBackButton';
import { ChatRoomsList } from './components/ChatRoomsList';
import { RecentUsersPanel } from './components/RecentUsersPanel';
import { ProfileSettingsPanel } from './components/ProfileSettingsPanel';
import { TalkComposeModal, type TalkComposeValues } from './components/TalkComposeModal';
import { TalkPanel2 } from './components/TalkPanel2';
import { talkPosts } from './data/homeMockData';
import './HomePage.css';
import './HomeExtra.css';
import './ProfileAvatar.css';
import './components/HomeUiPolish.css';

type HomeTab = 'talk' | 'people' | 'chats' | 'settings';
const tabs: { id: HomeTab; label: string; icon: string }[] = [
  { id: 'talk', label: '토크', icon: '💬' },
  { id: 'people', label: '사람', icon: '💕' },
  { id: 'chats', label: '채팅', icon: '✉️' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];
const titles: Record<HomeTab, string> = { talk: '지금 대화하고 싶은 사람들', people: '최근 접속자', chats: '내 대화 목록', settings: '내 설정' };
const fallbackPosts: D1TalkPost[] = talkPosts.map((post) => ({ ...post, id: String(post.id), created_at: new Date().toISOString() }));

function hasRoomHash() {
  return window.location.hash.startsWith('#room=');
}

function clearRoomHash() {
  if (hasRoomHash()) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

export function HomeScreenNext() {
  const [activeTab, setActiveTab] = useState<HomeTab>('talk');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [posts, setPosts] = useState<D1TalkPost[]>(fallbackPosts);
  const [profile, setProfile] = useState<MyProfile>(defaultProfile);
  const [openRoom, setOpenRoom] = useState<D1ChatRoom | null>(null);
  const [chatListKey, setChatListKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [hasNewChat, setHasNewChat] = useState(false);
  const lastRoomTimesRef = useRef<Record<string, string>>({});
  const initializedChatWatchRef = useRef(false);

  const refreshTalkPosts = () => {
    loadD1TalkPosts().then((loaded) => { if (loaded.length > 0) setPosts(loaded); });
  };

  const changeTab = (tab: HomeTab) => {
    setActiveTab(tab);
    if (tab === 'talk') refreshTalkPosts();
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
    setChatListKey((current) => current + 1);
  }, []);

  useAndroidBackButton(useCallback(() => {
    if (isComposeOpen) {
      setIsComposeOpen(false);
      return true;
    }

    if (activeTab === 'chats') {
      if (openRoom || hasRoomHash()) {
        closeChatRoom();
        return true;
      }

      setActiveTab('talk');
      refreshTalkPosts();
      return true;
    }

    if (activeTab !== 'talk') {
      setActiveTab('talk');
      refreshTalkPosts();
      return true;
    }

    return false;
  }, [activeTab, closeChatRoom, isComposeOpen, openRoom]));

  useEffect(() => {
    const savedProfile = loadMyProfile();
    setProfile(savedProfile);
    touchRecentUser(savedProfile).catch(() => undefined);
    refreshTalkPosts();
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice('');
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (activeTab !== 'talk') return;

    const timer = window.setInterval(() => {
      if (document.hidden || isComposeOpen) return;
      refreshTalkPosts();
    }, POLLING_INTERVALS.talkPosts);

    return () => window.clearInterval(timer);
  }, [activeTab, isComposeOpen]);

  useEffect(() => {
    const checkRooms = async () => {
      const rooms = await loadD1ChatRooms();
      const previous = lastRoomTimesRef.current;
      let hasNew = rooms.some((room) => Number(room.unread_count ?? 0) > 0);

      for (const room of rooms) {
        const currentTime = room.last_message_at ?? '';
        const previousTime = previous[room.id];

        if (initializedChatWatchRef.current && currentTime && previousTime && currentTime !== previousTime) {
          hasNew = true;
        }

        previous[room.id] = currentTime;
      }

      initializedChatWatchRef.current = true;

      if (hasNew && activeTab !== 'chats') {
        setHasNewChat(true);
        setNotice('새 메시지가 도착했어요. 채팅 탭에서 확인해보세요.');
      }
    };

    checkRooms().catch(() => undefined);
    const timer = window.setInterval(() => {
      checkRooms().catch(() => undefined);
    }, POLLING_INTERVALS.chatRooms);

    return () => window.clearInterval(timer);
  }, [activeTab]);

  const submitTalk = async (values: TalkComposeValues) => {
    await touchRecentUser(profile).catch(() => undefined);
    const saved = await createD1TalkPost(values.text, values.mood, profile);
    setPosts((current) => [saved, ...current]);
    setIsComposeOpen(false);
    setActiveTab('talk');
    refreshTalkPosts();
  };

  const removeTalk = async (id: string) => {
    setPosts((current) => current.filter((post) => post.id !== id));
    await deleteD1TalkPost(id);
    refreshTalkPosts();
  };

  const saveProfile = (next: MyProfile) => {
    const previousNickname = profile.nickname;
    saveMyProfile(next);
    setProfile(next);
    syncProfile(previousNickname, next).catch(() => undefined);
    touchRecentUser(next).catch(() => undefined);
    refreshTalkPosts();
    setNotice('프로필이 저장됐어요.');
  };

  const openDirectRoom = (room: D1ChatRoom) => {
    setOpenRoom(room);
    setHasNewChat(false);
    setActiveTab('chats');
  };

  return (
    <main className="app-shell">
      <section className="home-screen" aria-labelledby="home-title">
        <header className="home-header"><div><p className="home-kicker">플러팅</p><h1 id="home-title">{titles[activeTab]}</h1></div></header>
        {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
        {activeTab === 'talk' && <TalkPanel2 posts={posts} myNickname={profile.nickname} onDeletePost={removeTalk} onOpenCompose={() => setIsComposeOpen(true)} onOpenRoom={openDirectRoom} />}
        {activeTab === 'people' && <RecentUsersPanel onOpenRoom={openDirectRoom} />}
        {activeTab === 'chats' && <ChatRoomsList key={chatListKey} initialRoom={openRoom} />}
        {activeTab === 'settings' && <ProfileSettingsPanel myProfile={profile} onSave={saveProfile} />}
      </section>
      <nav className="bottom-nav" aria-label="주요 메뉴">{tabs.map((tab) => <button className={activeTab === tab.id ? 'nav-item is-active' : 'nav-item'} key={tab.id} onClick={() => changeTab(tab.id)} type="button"><span>{tab.icon}</span>{tab.label}{tab.id === 'chats' && hasNewChat ? <em className="nav-dot" aria-label="새 채팅 알림" /> : null}</button>)}</nav>
      <TalkComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} onSubmit={submitTalk} />
    </main>
  );
}
