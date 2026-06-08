import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { createD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import type { D1TalkPost } from '../api/d1TalkPosts';
import { recommendedUsers } from '../data/homeMockData';

type OpenRoom = (room: D1ChatRoom) => void;

export function TalkPanel({ onOpenCompose, onOpenRoom, posts }: { posts: D1TalkPost[]; onOpenCompose: () => void; onOpenRoom: OpenRoom }) {
  const startTalk = async (nickname: string) => {
    const room = await createD1ChatRoom(`${nickname}님과의 대화`);
    if (room) onOpenRoom(room);
  };

  return (
    <>
      <section className="quick-compose" aria-label="한줄 토크 작성">
        <div><strong>한줄 토크를 남겨보세요</strong><p>가벼운 인사, 취미, 오늘의 기분으로 대화를 시작해요.</p></div>
        <Button onClick={onOpenCompose}>작성하기</Button>
      </section>
      <section className="recommend-section" aria-label="추천 사용자">
        <div className="section-title-row"><h2>추천 친구</h2><button type="button">더보기</button></div>
        <div className="recommend-list">{recommendedUsers.map((user) => <RecommendCard key={user.id} onStart={() => startTalk(user.nickname)} user={user} />)}</div>
      </section>
      <section className="talk-section" aria-label="한줄 토크 목록">
        <div className="section-title-row"><h2>실시간 토크</h2><button type="button">필터</button></div>
        <div className="talk-list">{posts.map((post) => <TalkCard key={post.id} onStart={() => startTalk(post.nickname)} post={post} />)}</div>
      </section>
    </>
  );
}

function RecommendCard({ onStart, user }: { user: (typeof recommendedUsers)[number]; onStart: () => void }) {
  return <Card className="recommend-card"><Avatar name={user.nickname} online={user.online} /><strong>{user.nickname}</strong><p>{user.age} · {user.location}</p><span className="match-rate">{user.matchRate}% 맞음</span><div className="talk-actions"><button type="button" onClick={onStart}>채팅</button></div></Card>;
}

function TalkCard({ onStart, post }: { post: D1TalkPost; onStart: () => void }) {
  return <Card as="article" className="talk-card"><div className="talk-card-header"><Avatar name={post.nickname} online={post.online} /><div><strong>{post.nickname}</strong><p>{post.age} · {post.location} · {post.mood}</p></div></div><p className="talk-text">{post.text}</p><div className="tag-row">{post.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><div className="talk-actions"><span>♡ {post.likes}</span><span>댓글 {post.replies}</span><button type="button" onClick={onStart}>대화하기</button></div></Card>;
}

function Avatar({ name, online }: { name: string; online: boolean }) {
  return <div className="avatar-wrap"><span className="avatar">{name.slice(0, 1)}</span><span className={online ? 'status-dot is-online' : 'status-dot'} /></div>;
}
