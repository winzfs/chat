import { useEffect, useState } from 'react';
import { Card } from '../../shared/components/Card';
import type { D1ChatRoom } from './api/d1ChatRooms';
import { createD1TalkPost, loadD1TalkPosts, type D1TalkPost } from './api/d1TalkPosts';
import { defaultProfile, loadMyProfile, saveMyProfile, type MyProfile } from './api/profileStorage';
import { ChatRoomsList } from './components/ChatRoomsList';
import { PeoplePanel } from './components/PeoplePanel';
import { ProfileSettingsPanel } from './components/ProfileSettingsPanel';
import { TalkComposeModal, type TalkComposeValues } from './components/TalkComposeModal';
import { TalkPanel } from './components/TalkPanel';
import { talkPosts } from './data/homeMockData';
import './HomePage.css';

type HomeTab = 'talk' | 'people' | 'chats' | 'settings';
const tabs: { id: HomeTab; label: string; icon: string }[] = [
  { id: 'talk', label: '토크', icon: '💬' },
  { id: 'people', label: '사람', icon: '💕' },
  { id: 'chats', label: '채팅', icon: '✉️' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];
const titles: Record<HomeTab, string> = { talk: '지금 대화하고 싶은 사람들', people: '새로운 사람 둘러보기', chats: '내 대화 목록', settings: '내 설정' };
const fallbackPosts: D1TalkPost[] = talkPosts.map((post) => ({ ...post, id: String(post.id), created_at: new Date().toISOString() }));

export function HomeScreenNext() {
  const [activeTab, setActiveTab] = useState<HomeTab>('talk');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [posts, setPosts] = useState<D1TalkPost[]>(fallbackPosts);
  const [profile, setProfile] = useState<MyProfile>(defaultProfile);
  const [openRoom, setOpenRoom] = useState<D1ChatRoom | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setProfile(loadMyProfile());
    loadD1TalkPosts().then((loaded) => { if (loaded.length > 0) setPosts(loaded); });
  }, []);

  const submitTalk = async (values: TalkComposeValues) => {
    const saved = await createD1TalkPost(values.text, values.mood);
    setPosts((current) => [saved, ...current]);
    setIsComposeOpen(false);
    setActiveTab('talk');
  };

  const saveProfile = (next: MyProfile) => {
    saveMyProfile(next);
    setProfile(next);
    setNotice('프로필이 저장됐어요.');
  };

  const openDirectRoom = (room: D1ChatRoom) => {
    setOpenRoom(room);
    setActiveTab('chats');
  };

  return (
    <main className="app-shell">
      <section className="home-screen" aria-labelledby="home-title">
        <header className="home-header"><div><p className="home-kicker">ChitChat</p><h1 id="home-title">{titles[activeTab]}</h1></div><button className="profile-button" type="button" onClick={() => setActiveTab('settings')}>{profile.nickname.slice(0, 1)}</button></header>
        {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
        {activeTab === 'talk' && <TalkPanel posts={posts} onOpenCompose={() => setIsComposeOpen(true)} />}
        {activeTab === 'people' && <PeoplePanel onOpenRoom={openDirectRoom} />}
        {activeTab === 'chats' && <ChatRoomsList initialRoom={openRoom} />}
        {activeTab === 'settings' && <ProfileSettingsPanel myProfile={profile} onSave={saveProfile} />}
      </section>
      <nav className="bottom-nav" aria-label="주요 메뉴">{tabs.map((tab) => <button className={activeTab === tab.id ? 'nav-item is-active' : 'nav-item'} key={tab.id} onClick={() => setActiveTab(tab.id)} type="button"><span>{tab.icon}</span>{tab.label}</button>)}</nav>
      <TalkComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} onSubmit={submitTalk} />
    </main>
  );
}
