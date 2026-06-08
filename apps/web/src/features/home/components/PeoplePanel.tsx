import { Card } from '../../../shared/components/Card';
import { createD1ChatRoom, type D1ChatRoom } from '../api/d1ChatRooms';
import { recommendedUsers } from '../data/homeMockData';

type RecommendedUser = (typeof recommendedUsers)[number];

export function PeoplePanel({ onOpenRoom }: { onOpenRoom: (room: D1ChatRoom) => void }) {
  const handleOpen = async (user: RecommendedUser) => {
    const room = await createD1ChatRoom(`${user.nickname} room`);
    if (room) onOpenRoom(room);
  };

  return (
    <section className="talk-list" aria-label="사용자 목록">
      {recommendedUsers.map((user) => (
        <Card className="person-card" key={user.id}>
          <div className="talk-card-header">
            <div className="avatar-wrap"><span className="avatar">{user.nickname.slice(0, 1)}</span><span className={user.online ? 'status-dot is-online' : 'status-dot'} /></div>
            <div><strong>{user.nickname}</strong><p>{user.age} · {user.location} · {user.matchRate}%</p></div>
          </div>
          <div className="talk-actions"><span>프로필</span><button type="button" onClick={() => handleOpen(user)}>열기</button></div>
        </Card>
      ))}
    </section>
  );
}
