import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { createD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import { loadRecentUsers, type RecentUser } from '../api/recentUsers';

export function RecentUsersPanel({ onOpenRoom }: { onOpenRoom: (room: D1ChatRoom) => void }) {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadRecentUsers().then(setUsers);
  }, []);

  const openChat = async (user: RecentUser) => {
    setNotice(`${user.nickname}님과 연결하는 중...`);
    const room = await createD1ChatRoom(`${user.nickname}님과의 대화`);
    if (room) {
      setNotice('');
      onOpenRoom(room);
      return;
    }
    setNotice('채팅방을 열지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  return (
    <section className="talk-list" aria-label="최근 접속자">
      <Card className="settings-summary"><strong>최근 접속자</strong><p>{users.length}명이 최근 접속했어요.</p></Card>
      {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
      {users.length === 0 && <Card className="person-card"><strong>아직 최근 접속자가 없어요</strong><p>다른 탭이나 기기에서 프로필 저장/토크 작성 후 다시 확인해보세요.</p></Card>}
      {users.map((user) => (
        <Card className="person-card" key={user.id}>
          <div className="talk-card-header">
            <div className="avatar-wrap"><span className="avatar">{user.nickname.slice(0, 1)}</span><span className={user.online ? 'status-dot is-online' : 'status-dot'} /></div>
            <div><strong>{user.nickname}</strong><p>{user.age ?? '-'} · {user.location ?? '내 주변'} · 최근 접속</p></div>
          </div>
          <div className="talk-actions"><span>{user.bio || '대화 가능한 사용자'}</span><button type="button" onClick={() => openChat(user)}>채팅 걸기</button></div>
        </Card>
      ))}
    </section>
  );
}
