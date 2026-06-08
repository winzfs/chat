import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { loadD1ChatRooms, type D1ChatRoom } from '../api/d1ChatRooms';
import { ChatRoomPanel } from './ChatRoomPanel';

function readRoomIdFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('room');
}

function writeRoomIdToHash(roomId: string) {
  window.location.hash = `room=${encodeURIComponent(roomId)}`;
}

function clearRoomHash() {
  if (window.location.hash.startsWith('#room=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export function ChatRoomsList({ initialRoom }: { initialRoom?: D1ChatRoom | null }) {
  const [rooms, setRooms] = useState<D1ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<D1ChatRoom | null>(initialRoom ?? null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRooms = () => {
    setIsLoading(true);
    loadD1ChatRooms()
      .then((loadedRooms) => {
        setRooms(loadedRooms);
        const hashRoomId = readRoomIdFromHash();
        const hashRoom = loadedRooms.find((room) => room.id === hashRoomId);

        if (initialRoom) {
          setSelectedRoom(initialRoom);
          writeRoomIdToHash(initialRoom.id);
          return;
        }

        if (hashRoom) {
          setSelectedRoom(hashRoom);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRooms();
  }, [initialRoom]);

  const openRoom = (room: D1ChatRoom) => {
    writeRoomIdToHash(room.id);
    setSelectedRoom(room);
  };

  const closeRoom = () => {
    clearRoomHash();
    setSelectedRoom(null);
    loadRooms();
  };

  if (selectedRoom) {
    return <ChatRoomPanel room={selectedRoom} onClose={closeRoom} />;
  }

  if (isLoading) {
    return <section className="talk-list" aria-label="채팅 목록"><Card className="person-card"><strong>채팅 목록을 불러오는 중...</strong></Card></section>;
  }

  return (
    <section className="talk-list" aria-label="채팅 목록">
      <Card className="settings-summary">
        <strong>Cloudflare D1 모드</strong>
        <p>{rooms.length}개 채팅방을 불러왔어요.</p>
      </Card>
      {rooms.map((room) => <ChatRoomCard key={room.id} onOpen={() => openRoom(room)} room={room} />)}
    </section>
  );
}

function ChatRoomCard({ onOpen, room }: { onOpen: () => void; room: D1ChatRoom }) {
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
        <button type="button" onClick={onOpen}>열기</button>
      </div>
    </Card>
  );
}
