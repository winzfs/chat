import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { openDirectD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { POLLING_INTERVALS } from '../api/pollingIntervals';
import { loadRecentUsers, type RecentUser } from '../api/recentUsers';
import { ProfilePreviewModal, type ProfilePreview } from './ProfilePreviewModal';
import { UserAvatar } from './UserAvatar';

export function RecentUsersPanel({ onOpenRoom }: { myNickname?: string; onOpenRoom: (room: D1ChatRoom) => void }) {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [notice, setNotice] = useState('');
  const [previewProfile, setPreviewProfile] = useState<ProfilePreview | null>(null);
  const currentProfileId = getProfileId();

  const refreshUsers = () => {
    loadRecentUsers().then((loadedUsers) => {
      setUsers(loadedUsers.filter((user) => user.id !== currentProfileId));
    });
  };

  useEffect(() => {
    refreshUsers();

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      refreshUsers();
    }, POLLING_INTERVALS.recentUsers);

    return () => window.clearInterval(timer);
  }, [currentProfileId]);

  const openChat = async (user: RecentUser) => {
    if (user.id === currentProfileId) {
      setNotice('내 프로필에는 채팅을 걸 수 없어요.');
      return;
    }

    setNotice(`${user.nickname}님과 연결하는 중...`);
    const room = await openDirectD1ChatRoom(user.nickname, user.id);
    if (room) {
      setNotice('');
      onOpenRoom(room);
      return;
    }
    setNotice('채팅방을 열지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  const previewUser = (user: RecentUser) => {
    setPreviewProfile({ nickname: user.nickname, age: user.age, location: user.location, bio: user.bio, avatar_url: user.avatar_url });
  };

  return (
    <section className="talk-list" aria-label="최근 접속자">
      <Card className="settings-summary"><strong>최근 접속자</strong><p>{users.length}명이 최근 접속했어요. 자동으로 갱신돼요.</p></Card>
      {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
      {users.length === 0 && <Card className="person-card"><strong>아직 다른 접속자가 없어요</strong><p>다른 탭이나 기기에서 다른 닉네임으로 프로필 저장 후 다시 확인해보세요.</p></Card>}
      {users.map((user) => (
        <Card className="person-card" key={user.id}>
          <div className="talk-card-header">
            <button className="profile-icon-button" type="button" onClick={() => previewUser(user)}><UserAvatar imageUrl={user.avatar_url} name={user.nickname} /><span className={user.online ? 'status-dot is-online' : 'status-dot'} /></button>
            <div><strong>{user.nickname}</strong><p>{user.age ?? '-'} · {user.location ?? '내 주변'} · 최근 접속</p></div>
          </div>
          <div className="talk-actions"><span>{user.bio || '대화 가능한 사용자'}</span><button type="button" onClick={() => openChat(user)}>채팅 걸기</button></div>
        </Card>
      ))}
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} />}
    </section>
  );
}
