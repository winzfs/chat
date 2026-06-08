import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { loadD1ChatRooms, type D1ChatRoom } from '../api/d1ChatRooms';

export function ChatRoomsList() {
  const [rooms, setRooms] = useState<D1ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadD1ChatRooms()
      .then(setRooms)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <section className="talk-list" aria-label="채팅 목록"><Card className="person-card"><strong>채팅 목록을 불러오는 중...</strong></Card></section>;
  }

  return (
    <section className="talk-list" aria-label="채팅 목록">
      <Card className="settings-summary">
        <strong>Cloudflare D1 모드</strong>
        <p>{rooms.length}개 채팅방을 불러왔어요.</p>
      </Card>
      {rooms.map((room) => <ChatRoomCard key={room.id} room={room} />)}
    </section>
  );
}

function ChatRoomCard({ room }: { room: D1ChatRoom }) {
  const title = room.title ?? '새 채팅방';

  return (
    <Card className="person-card">
      <div className="talk-card-header">
        <div className="avatar-wrap">
          <span className="avatar">{title.slice(0, 1)}</span>
          <span className="status-dot is-online" />
        </div>
        <div>
          <strong>{title}</strong>
          <p>{room.last_message ?? '아직 메시지가 없어요.'}</p>
        </div>
      </div>
      <div className="talk-actions">
        <span>최근 대화</span>
        <button type="button">열기</button>
      </div>
    </Card>
  );
}
