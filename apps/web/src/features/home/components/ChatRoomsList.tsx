import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { fetchChatRooms, type ChatRoomRecord } from '../api/chatRooms';

export function ChatRoomsList() {
  const [rooms, setRooms] = useState<ChatRoomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChatRooms()
      .then(setRooms)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <section className="talk-list" aria-label="채팅 목록"><Card className="person-card"><strong>채팅 목록을 불러오는 중...</strong></Card></section>;
  }

  return (
    <section className="talk-list" aria-label="채팅 목록">
      {rooms.map((room) => <ChatRoomCard key={room.id} room={room} />)}
    </section>
  );
}

function ChatRoomCard({ room }: { room: ChatRoomRecord }) {
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
