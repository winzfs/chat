import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { openDirectD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import type { D1TalkPost } from '../api/d1TalkPosts';

type OpenRoom = (room: D1ChatRoom) => void;

export function TalkPanel2({ myNickname, onDeletePost, onOpenCompose, onOpenRoom, posts }: { posts: D1TalkPost[]; myNickname: string; onDeletePost: (id: string) => void; onOpenCompose: () => void; onOpenRoom: OpenRoom }) {
  const startTalk = async (nickname: string) => {
    const room = await openDirectD1ChatRoom(nickname);
    if (room) onOpenRoom(room);
  };

  return (
    <>
      <section className="quick-compose" aria-label="한줄 토크 작성"><div><strong>한줄 토크를 남겨보세요</strong><p>내 글은 다른 색으로 표시되고 직접 삭제할 수 있어요.</p></div><Button onClick={onOpenCompose}>작성하기</Button></section>
      <section className="talk-section" aria-label="한줄 토크 목록"><div className="section-title-row"><h2>실시간 토크</h2><button type="button">필터</button></div><div className="talk-list">{posts.map((post) => <TalkCard key={post.id} isMine={post.nickname === myNickname} onDelete={() => onDeletePost(post.id)} onStart={() => startTalk(post.nickname)} post={post} />)}</div></section>
    </>
  );
}

function TalkCard({ isMine, onDelete, onStart, post }: { post: D1TalkPost; isMine: boolean; onDelete: () => void; onStart: () => void }) {
  return <Card as="article" className={isMine ? 'talk-card is-mine' : 'talk-card'}><div className="talk-card-header"><div className="avatar-wrap"><span className="avatar">{post.nickname.slice(0, 1)}</span><span className={post.online ? 'status-dot is-online' : 'status-dot'} /></div><div><strong>{post.nickname}{isMine ? ' · 내 글' : ''}</strong><p>{post.age} · {post.location} · {post.mood}</p></div></div><p className="talk-text">{post.text}</p><div className="tag-row">{post.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><div className="talk-actions"><span>♡ {post.likes}</span><span>댓글 {post.replies}</span>{isMine ? <button type="button" onClick={onDelete}>삭제</button> : <button type="button" onClick={onStart}>대화하기</button>}</div></Card>;
}
