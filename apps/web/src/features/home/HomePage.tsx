import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { recommendedUsers, talkPosts } from './data/homeMockData';
import './HomePage.css';

const navItems = [
  { label: '토크', icon: '💬', active: true },
  { label: '사람', icon: '💕', active: false },
  { label: '채팅', icon: '✉️', active: false },
  { label: '설정', icon: '⚙️', active: false },
];

export function HomePage() {
  return (
    <main className="app-shell">
      <section className="home-screen" aria-labelledby="home-title">
        <header className="home-header">
          <div>
            <p className="home-kicker">오늘의 한줄 토크</p>
            <h1 id="home-title">지금 대화하고 싶은 사람들</h1>
          </div>
          <button className="profile-button" type="button" aria-label="내 프로필">🙂</button>
        </header>

        <section className="quick-compose" aria-label="한줄 토크 작성">
          <div>
            <strong>한줄 토크를 남겨보세요</strong>
            <p>가벼운 인사, 취미, 오늘의 기분으로 대화를 시작해요.</p>
          </div>
          <Button>작성하기</Button>
        </section>

        <section className="recommend-section" aria-label="추천 사용자">
          <div className="section-title-row">
            <h2>추천 친구</h2>
            <button type="button">더보기</button>
          </div>
          <div className="recommend-list">
            {recommendedUsers.map((user) => (
              <Card className="recommend-card" key={user.id}>
                <div className="avatar-wrap">
                  <span className="avatar">{user.nickname.slice(0, 1)}</span>
                  <span className={user.online ? 'status-dot is-online' : 'status-dot'} />
                </div>
                <strong>{user.nickname}</strong>
                <p>{user.age} · {user.location}</p>
                <span className="match-rate">{user.matchRate}% 맞음</span>
              </Card>
            ))}
          </div>
        </section>

        <section className="talk-section" aria-label="한줄 토크 목록">
          <div className="section-title-row">
            <h2>실시간 토크</h2>
            <button type="button">필터</button>
          </div>
          <div className="talk-list">
            {talkPosts.map((post) => (
              <Card as="article" className="talk-card" key={post.id}>
                <div className="talk-card-header">
                  <div className="avatar-wrap">
                    <span className="avatar">{post.nickname.slice(0, 1)}</span>
                    <span className={post.online ? 'status-dot is-online' : 'status-dot'} />
                  </div>
                  <div>
                    <strong>{post.nickname}</strong>
                    <p>{post.age} · {post.location} · {post.mood}</p>
                  </div>
                </div>
                <p className="talk-text">{post.text}</p>
                <div className="tag-row">
                  {post.tags.map((tag) => (
                    <span className="tag" key={tag}>#{tag}</span>
                  ))}
                </div>
                <div className="talk-actions">
                  <span>♡ {post.likes}</span>
                  <span>댓글 {post.replies}</span>
                  <button type="button">대화하기</button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </section>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navItems.map((item) => (
          <button className={item.active ? 'nav-item is-active' : 'nav-item'} key={item.label} type="button">
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
