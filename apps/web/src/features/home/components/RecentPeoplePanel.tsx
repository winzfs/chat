import { useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { createD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import { recommendedUsers } from '../data/homeMockData';

export function RecentPeoplePanel({ onOpenRoom }: { onOpenRoom: (room: D1ChatRoom) => void }) {
  const [notice, setNotice] = useState('');

  const openChat = async (nickname: string) => {
    setNotice(`${nickname}님과 연결하는 중...`);
    const room = await createD1ChatRoom(`${nickname}님과의 대화`);
    if (room) {
      setNotice('');
      onOpenRoom(room);
      return;
    }
    setNotice('채팅방을 열지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  return (
    <section className="talk-list" aria-label="최근 접속자">
      <Card className="settings-summary"><strong>최근 접속자</strong><p>최근 활동한 사람들과 바로 대화를 시작해요.</p></Card>
      {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
      {recommendedUsers.map((user) => (
        <Card className="person-card" key={user.id}>
          <div className="talk-card-header">
            <div className="avatar-wrap"><span className="avatar">{user.nickname.slice(0, 1)}</span><span className={user.online ? 'status-dot is-online' : 'status-dot'} /></div>
            <div><strong>{user.nickname}</strong><p>{user.age} · {user.location} · {user.online ? '접속 중' : '최근 접속'}</p></div>
          </div>
          <div className="talk-actions"><span>매칭 {user.matchRate}%</span><button type="button">프로필</button><button type="button" onClick={() => openChat(user.nickname)}>채팅 걸기</button></div>
        </Card>
      ))}
    </section>
  );
}
