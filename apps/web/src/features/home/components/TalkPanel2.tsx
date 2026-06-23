import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { openDirectD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import type { D1TalkPost } from '../api/d1TalkPosts';
import { ProfilePreviewModal, type ProfilePreview } from './ProfilePreviewModal';

type OpenRoom = (room: D1ChatRoom) => void;

function confirmPointSpend() {
  return window.confirm('쪽지를 시작하면 100P가 사용될 수 있어요. 계속할까요?');
}

export function TalkPanel2({ myProfileId, onDeletePost, onOpenCompose, onOpenRoom, posts }: { posts: D1TalkPost[]; myProfileId: string; onDeletePost: (id: string) => void; onOpenCompose: () => void; onOpenRoom: OpenRoom }) {
  const [previewProfile, setPreviewProfile] = useState<ProfilePreview | null>(null);
  const [notice, setNotice] = useState('');

  const startTalk = async (post: D1TalkPost) => {
    if (!post.profile_id) {
      setNotice('작성자 계정 정보를 찾지 못했어요.');
      return;
    }
    if (!confirmPointSpend()) return;

    try {
      const room = await openDirectD1ChatRoom(post.nickname, post.profile_id);
      if (room) onOpenRoom(room);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '채팅방을 열지 못했어요.');
    }
  };

  const openPreviewChat = async () => {
    if (!previewProfile?.profile_id) {
      setNotice('상대방 계정 정보를 찾지 못했어요.');
      return;
    }
    if (!confirmPointSpend()) return;

    try {
      const room = await openDirectD1ChatRoom(previewProfile.nickname, previewProfile.profile_id);
      if (room) {
        setPreviewProfile(null);
        onOpenRoom(room);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '채팅방을 열지 못했어요.');
    }
  };

  return (
    <>
      <section className="quick-compose" aria-label="한줄 토크 작성"><div><strong>한줄 토크를 남겨보세요</strong><p>하루 한 번 토크 작성 보상 100포인트를 받을 수 있어요.</p></div><Button onClick={onOpenCompose}>작성하기</Button></section>
      {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
      <section className="talk-section" aria-label="한줄 토크 목록"><div className="section-title-row"><h2>실시간 토크</h2><button type="button">필터</button></div><div className="talk-list">{posts.map((post) => <TalkCard key={post.id} isMine={Boolean(post.profile_id && post.profile_id === myProfileId)} onDelete={() => onDeletePost(post.id)} onPreview={() => setPreviewProfile({ profile_id: post.profile_id, nickname: post.nickname, age: post.age, location: post.location, avatar_url: post.avatar_url })} onStart={() => startTalk(post)} post={post} />)}</div></section>
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} onStartChat={openPreviewChat} />}
    </>
  );
}

function TalkCard({ isMine, onDelete, onPreview, onStart, post }: { post: D1TalkPost; isMine: boolean; onDelete: () => void; onPreview: () => void; onStart: () => void }) {
  return <Card as="article" className={isMine ? 'talk-card is-mine' : 'talk-card'}><div className="talk-card-header"><button className="profile-icon-button" type="button" onClick={onPreview}>{post.avatar_url ? <img alt={`${post.nickname} 프로필`} className="avatar-image" src={post.avatar_url} /> : <span className="avatar">{post.nickname.slice(0, 1)}</span>}<span className={post.online ? 'status-dot is-online' : 'status-dot'} /></button><div><strong>{post.nickname}{isMine ? ' · 내 글' : ''}</strong><p>{post.age} · {post.location}</p></div></div><p className="talk-text">{post.text}</p><div className="talk-actions"><span>♡ {post.likes}</span><span>댓글 {post.replies}</span>{isMine ? <button type="button" onClick={onDelete}>삭제</button> : <button type="button" onClick={onStart}>쪽지 100P</button>}</div></Card>;
}
