import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { formatApiError } from '../api/apiResponse';
import { openDirectD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { POLLING_INTERVALS } from '../api/pollingIntervals';
import { loadRecentUsers, type RecentUser } from '../api/recentUsers';
import { ProfilePreviewModal, type ProfilePreview } from './ProfilePreviewModal';
import { UserAvatar } from './UserAvatar';

function confirmPointSpend() {
  return window.confirm('쪽지를 시작하면 100P가 사용될 수 있어요. 계속할까요?');
}

export function RecentUsersPanel({ onOpenRoom }: { myNickname?: string; onOpenRoom: (room: D1ChatRoom) => void }) {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [notice, setNotice] = useState('');
  const [previewProfile, setPreviewProfile] = useState<ProfilePreview | null>(null);
  const currentProfileId = getProfileId();

  const refreshUsers = (showError = false) => {
    loadRecentUsers()
      .then((loadedUsers) => {
        setUsers(loadedUsers.filter((user) => user.id !== currentProfileId));
        if (showError) setNotice('');
      })
      .catch((error) => {
        if (showError) setNotice(formatApiError(error, '최근 접속자를 불러오지 못했어요.'));
      });
  };

  useEffect(() => {
    refreshUsers(true);

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      refreshUsers(false);
    }, POLLING_INTERVALS.recentUsers);

    return () => window.clearInterval(timer);
  }, [currentProfileId]);

  const openChat = async (user: RecentUser) => {
    if (user.id === currentProfileId) {
      setNotice('내 프로필에는 채팅을 걸 수 없어요.');
      return;
    }

    if (!confirmPointSpend()) return;

    setNotice(`${user.nickname}님과 연결하는 중...`);

    try {
      const room = await openDirectD1ChatRoom(user.nickname, user.id);
      setNotice('');
      onOpenRoom(room);
    } catch (error) {
      setNotice(formatApiError(error, '채팅방을 열지 못했어요.'));
    }
  };

  const openPreviewChat = async () => {
    if (!previewProfile || !confirmPointSpend()) return;

    try {
      const room = await openDirectD1ChatRoom(previewProfile.nickname, previewProfile.profile_id || undefined);
      setPreviewProfile(null);
      onOpenRoom(room);
    } catch (error) {
      setNotice(formatApiError(error, '채팅방을 열지 못했어요.'));
    }
  };

  const previewUser = (user: RecentUser) => {
    setPreviewProfile({ profile_id: user.id, nickname: user.nickname, age: user.age, location: user.location, bio: user.bio, avatar_url: user.avatar_url });
  };

  return (
    <section className="talk-list" aria-label="최근 접속자">
      <Card className="settings-summary"><strong>최근 접속자</strong><p>{users.length}명이 최근 접속했어요. 쪽지는 100포인트를 사용해요.</p></Card>
      {notice && <Card className="settings-summary"><strong aria-live="polite">{notice}</strong></Card>}
      {users.length === 0 && !notice && <Card className="person-card"><strong>아직 다른 접속자가 없어요</strong><p>다른 탭이나 기기에서 다른 닉네임으로 프로필 저장 후 다시 확인해보세요.</p></Card>}
      {users.map((user) => (
        <Card className="person-card" key={user.id}>
          <div className="talk-card-header">
            <button className="profile-icon-button" type="button" onClick={() => previewUser(user)}><UserAvatar imageUrl={user.avatar_url} name={user.nickname} /><span className={user.online ? 'status-dot is-online' : 'status-dot'} /></button>
            <div><strong>{user.nickname}</strong><p>{user.age ?? '-'} · {user.location || '지역 없음'} · 최근 접속</p></div>
          </div>
          <div className="talk-actions"><span>{user.bio || '대화 가능한 사용자'}</span><button type="button" onClick={() => openChat(user)}>쪽지 100P</button></div>
        </Card>
      ))}
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} onStartChat={openPreviewChat} />}
    </section>
  );
}
