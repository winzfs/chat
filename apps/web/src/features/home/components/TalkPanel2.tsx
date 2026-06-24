import { useRef, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { assetUrl } from '../api/apiBase';
import { formatApiError } from '../api/apiResponse';
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
  const [openingProfileId, setOpeningProfileId] = useState('');
  const openingProfileIdRef = useRef('');
  const previewIsMine = Boolean(previewProfile?.profile_id && previewProfile.profile_id === myProfileId);

  const openChat = async (profileId: string | null | undefined, nickname: string) => {
    if (!profileId) {
      setNotice('상대 사용자 정보를 찾지 못했어요. 목록을 새로고침해주세요.');
      return;
    }
    if (openingProfileIdRef.current || !confirmPointSpend()) return;

    openingProfileIdRef.current = profileId;
    setOpeningProfileId(profileId);
    setNotice('');
    try {
      const room = await openDirectD1ChatRoom(nickname, profileId);
      setPreviewProfile(null);
      onOpenRoom(room);
    } catch (error) {
      setNotice(formatApiError(error, '채팅방을 열지 못했어요.'));
    } finally {
      openingProfileIdRef.current = '';
      setOpeningProfileId('');
    }
  };

  return (
    <>
      <section className="quick-compose" aria-label="한줄 토크 작성">
        <div><strong>한줄 토크를 남겨보세요</strong><p>하루 한 번 토크 작성 보상 100포인트를 받을 수 있어요.</p></div>
        <Button onClick={onOpenCompose}>작성하기</Button>
      </section>
      {notice && <Card className="settings-summary"><strong aria-live="polite">{notice}</strong></Card>}
      <section className="talk-section" aria-label="한줄 토크 목록">
        <div className="section-title-row"><h2>실시간 토크</h2></div>
        <div className="talk-list">
          {posts.length === 0 && <Card className="person-card"><strong>아직 등록된 토크가 없어요.</strong><p>첫 번째 한줄 토크를 남겨보세요.</p></Card>}
          {posts.map((post) => (
            <TalkCard
              key={post.id}
              isMine={Boolean(post.profile_id && post.profile_id === myProfileId)}
              isOpening={openingProfileId === post.profile_id}
              onDelete={() => onDeletePost(post.id)}
              onPreview={() => setPreviewProfile({ profile_id: post.profile_id, nickname: post.nickname, age: post.age, location: post.location, avatar_url: post.avatar_url })}
              onStart={() => openChat(post.profile_id, post.nickname)}
              post={post}
            />
          ))}
        </div>
      </section>
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} onStartChat={previewIsMine ? undefined : () => openChat(previewProfile.profile_id, previewProfile.nickname)} />}
    </>
  );
}

function TalkCard({ isMine, isOpening, onDelete, onPreview, onStart, post }: { post: D1TalkPost; isMine: boolean; isOpening: boolean; onDelete: () => void; onPreview: () => void; onStart: () => void }) {
  const avatarUrl = assetUrl(post.avatar_url);

  return (
    <Card as="article" className={isMine ? 'talk-card is-mine' : 'talk-card'}>
      <div className="talk-card-header">
        <button aria-label={`${post.nickname} 프로필 보기`} className="profile-icon-button" type="button" onClick={onPreview}>
          {avatarUrl ? <img alt="" aria-hidden="true" className="avatar-image" src={avatarUrl} /> : <span className="avatar" aria-hidden="true">{post.nickname.slice(0, 1)}</span>}
          <span className={post.online ? 'status-dot is-online' : 'status-dot'} aria-hidden="true" />
        </button>
        <div><strong>{post.nickname}{isMine ? ' · 내 글' : ''}</strong><p>{post.age ?? '-'} · {post.location || '지역 없음'}</p></div>
      </div>
      <p className="talk-text">{post.text}</p>
      <div className="talk-actions">
        <span>♡ {post.likes}</span><span>댓글 {post.replies}</span>
        {isMine ? <button type="button" onClick={onDelete}>삭제</button> : <button disabled={isOpening} type="button" onClick={onStart}>{isOpening ? '연결 중...' : '쪽지 100P'}</button>}
      </div>
    </Card>
  );
}
