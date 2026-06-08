import { useEffect, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { createTalkPost, fetchTalkPosts } from './api/talkPostsApi';
import { TalkComposeModal, type TalkComposeValues } from './components/TalkComposeModal';
import { recommendedUsers, talkPosts } from './data/homeMockData';
import './HomePage.css';

type HomeTab = 'talk' | 'people' | 'chats' | 'settings';
type TalkPost = (typeof talkPosts)[number];

const navItems: Array<{ id: HomeTab; label: string; icon: string }> = [
  { id: 'talk', label: '토크', icon: '💬' },
  { id: 'people', label: '사람', icon: '💕' },
  { id: 'chats', label: '채팅', icon: '✉️' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];

const titles: Record<HomeTab, string> = {
  talk: '지금 대화하고 싶은 사람들',
  people: '새로운 사람 둘러보기',
  chats: '내 대화 목록',
  settings: '내 설정',
};

export function HomeWithCompose() {
  const [activeTab, setActiveTab] = useState<HomeTab>('talk');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [posts, setPosts] = useState<TalkPost[]>(talkPosts);

  useEffect(() => {
    fetchTalkPosts()
      .then((loadedPosts) => {
        if (loadedPosts.length > 0) {
          setPosts(loadedPosts);
        }
      })
      .catch(() => {
        setPosts(talkPosts);
      });
  }, []);

  const handleSubmitTalk = async (values: TalkComposeValues) => {
    const newPost = await createTalkPost(values);

    setPosts((currentPosts) => [newPost, ...currentPosts]);
    setIsComposeOpen(false);
    setActiveTab('talk');
  };

  return (
    <main className="app-shell">
      <section className="home-screen" aria-labelledby="home-title">
        <header className="home-header">
          <div>
            <p className="home-kicker">ChitChat</p>
            <h1 id="home-title">{titles[activeTab]}</h1>
          </div>
          <button className="profile-button" type="button" aria-label="내 프로필">🙂</button>
        </header>

        {activeTab === 'talk' && <TalkTab posts={posts} onOpenCompose={() => setIsComposeOpen(true)} />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'chats' && <ChatsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </section>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navItems.map((item) => (
          <button className={activeTab === item.id ? 'nav-item is-active' : 'nav-item'} key={item.id} type="button" onClick={() => setActiveTab(item.id)}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <TalkComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} onSubmit={handleSubmitTalk} />
    </main>
  );
}

function TalkTab({ posts, onOpenCompose }: { posts: TalkPost[]; onOpenCompose: () => void }) {
  return (
    <>
      <section className="quick-compose" aria-label="한줄 토크 작성">
        <div>
          <strong>한줄 토크를 남겨보세요</strong>
          <p>가벼운 인사, 취미, 오늘의 기분으로 대화를 시작해요.</p>
        </div>
        <Button onClick={onOpenCompose}>작성하기</Button>
      </section>
      <section className="recommend-section" aria-label="추천 사용자">
        <div className="section-title-row"><h2>추천 친구</h2><button type="button">더보기</button></div>
        <div className="recommend-list">{recommendedUsers.map((user) => <UserCard key={user.id} user={user} />)}</div>
      </section>
      <section className="talk-section" aria-label="한줄 토크 목록">
        <div className="section-title-row"><h2>실시간 토크</h2><button type="button">필터</button></div>
        <div className="talk-list">{posts.map((post) => <TalkCard key={post.id} post={post} />)}</div>
      </section>
    </>
  );
}

function PeopleTab() {
  return <section className="talk-list" aria-label="사용자 목록">{recommendedUsers.concat(recommendedUsers).map((user, index) => <PersonCard key={`${user.id}-${index}`} user={user} />)}</section>;
}

function ChatsTab() {
  return <section className="talk-list" aria-label="채팅 목록">{talkPosts.map((post) => <ChatCard key={post.id} post={post} />)}</section>;
}

function SettingsTab() {
  return (
    <section className="talk-list" aria-label="설정 목록">
      <Card className="settings-summary"><strong>민지님</strong><p>현재 포인트 120P · 온라인 표시 중</p></Card>
      {['내 프로필 수정', '포인트 충전', '알림 설정', '차단/신고 관리'].map((item) => <Card className="setting-item" key={item}><strong>{item}</strong><span>›</span></Card>)}
    </section>
  );
}

function UserCard({ user }: { user: (typeof recommendedUsers)[number] }) {
  return <Card className="recommend-card"><Avatar name={user.nickname} online={user.online} /><strong>{user.nickname}</strong><p>{user.age} · {user.location}</p><span className="match-rate">{user.matchRate}% 맞음</span></Card>;
}

function PersonCard({ user }: { user: (typeof recommendedUsers)[number] }) {
  return <Card className="person-card"><div className="talk-card-header"><Avatar name={user.nickname} online={user.online} /><div><strong>{user.nickname}</strong><p>{user.age} · {user.location} · 취향 매칭 {user.matchRate}%</p></div></div><div className="talk-actions"><span>대화 가능</span><button type="button">프로필 보기</button></div></Card>;
}

function ChatCard({ post }: { post: TalkPost }) {
  return <Card className="person-card"><div className="talk-card-header"><Avatar name={post.nickname} online={post.online} /><div><strong>{post.nickname}</strong><p>{post.text}</p></div></div><div className="talk-actions"><span>방금 전</span><button type="button">열기</button></div></Card>;
}

function TalkCard({ post }: { post: TalkPost }) {
  return <Card as="article" className="talk-card"><div className="talk-card-header"><Avatar name={post.nickname} online={post.online} /><div><strong>{post.nickname}</strong><p>{post.age} · {post.location} · {post.mood}</p></div></div><p className="talk-text">{post.text}</p><div className="tag-row">{post.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><div className="talk-actions"><span>♡ {post.likes}</span><span>댓글 {post.replies}</span><button type="button">대화하기</button></div></Card>;
}

function Avatar({ name, online }: { name: string; online: boolean }) {
  return <div className="avatar-wrap"><span className="avatar">{name.slice(0, 1)}</span><span className={online ? 'status-dot is-online' : 'status-dot'} /></div>;
}
