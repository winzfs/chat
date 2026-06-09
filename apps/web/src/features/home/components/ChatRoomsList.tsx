import { useEffect, useRef, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { leaveD1ChatRoom, loadD1ChatRooms, type D1ChatRoom } from '../api/d1ChatRooms';
import { POLLING_INTERVALS } from '../api/pollingIntervals';
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
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

export function ChatRoomsList({ initialRoom }: { initialRoom?: D1ChatRoom | null }) {
  const [rooms, setRooms] = useState<D1ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<D1ChatRoom | null>(initialRoom ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [newRoomIds, setNewRoomIds] = useState<Set<string>>(new Set());
  const lastRoomTimesRef = useRef<Record<string, string>>({});
  const initializedRef = useRef(false);

  const updateRooms = (loadedRooms: D1ChatRoom[], notify: boolean) => {
    setRooms(loadedRooms);
    const changedIds: string[] = [];

    for (const room of loadedRooms) {
      const currentTime = room.last_message_at ?? '';
      const previousTime = lastRoomTimesRef.current[room.id];

      if (notify && initializedRef.current && previousTime && currentTime && previousTime !== currentTime && selectedRoom?.id !== room.id) {
        changedIds.push(room.id);
      }

      lastRoomTimesRef.current[room.id] = currentTime;
    }

    initializedRef.current = true;

    if (changedIds.length > 0) {
      setNewRoomIds((current) => {
        const next = new Set(current);
        changedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const loadRooms = (notify = false) => {
    if (!notify) setIsLoading(true);
    loadD1ChatRooms()
      .then((loadedRooms) => {
        updateRooms(loadedRooms, notify);
        const hashRoomId = readRoomIdFromHash();
        const hashRoom = loadedRooms.find((room) => room.id === hashRoomId);

        if (initialRoom) {
          setSelectedRoom(initialRoom);
          writeRoomIdToHash(initialRoom.id);
          return;
        }

        if (hashRoom && !selectedRoom) {
          setSelectedRoom(hashRoom);
        }
      })
      .finally(() => {
        if (!notify) setIsLoading(false);
      });
  };

  useEffect(() => {
    loadRooms(false);
  }, [initialRoom]);

  useEffect(() => {
    if (selectedRoom) return;

    const timer = window.setInterval(() => {
      loadRooms(true);
    }, POLLING_INTERVALS.chatRooms);

    return () => window.clearInterval(timer);
  }, [selectedRoom, initialRoom]);

  const openRoom = (room: D1ChatRoom) => {
    writeRoomIdToHash(room.id);
    setNewRoomIds((current) => {
      const next = new Set(current);
      next.delete(room.id);
      return next;
    });
    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, unread_count: 0 } : item));
    setSelectedRoom({ ...room, unread_count: 0 });
  };

  const closeRoom = () => {
    clearRoomHash();
    setSelectedRoom(null);
    setIsLoading(true);
    loadD1ChatRooms().then((loadedRooms) => updateRooms(loadedRooms, false)).finally(() => setIsLoading(false));
  };

  const leaveRoom = async (room: D1ChatRoom) => {
    clearRoomHash();
    if (selectedRoom?.id === room.id) setSelectedRoom(null);
    setRooms((current) => current.filter((item) => item.id !== room.id));
    setNewRoomIds((current) => {
      const next = new Set(current);
      next.delete(room.id);
      return next;
    });
    await leaveD1ChatRoom(room.id);
  };

  if (selectedRoom) {
    return <ChatRoomPanel room={selectedRoom} onClose={closeRoom} />;
  }

  if (isLoading) {
    return <section className="talk-list" aria-label="채팅 목록"><Card className="person-card"><strong>채팅 목록을 불러오는 중...</strong></Card></section>;
  }

  const totalUnread = rooms.reduce((sum, room) => sum + Number(room.unread_count ?? 0), 0);

  return (
    <section className="talk-list" aria-label="채팅 목록">
      <Card className="settings-summary">
        <strong>내 채팅 목록</strong>
        <p>{rooms.length}개 채팅방 · 안 읽은 메시지 {totalUnread}개</p>
      </Card>
      {rooms.map((room) => <ChatRoomCard hasNewMessage={newRoomIds.has(room.id)} key={room.id} onLeave={() => leaveRoom(room)} onOpen={() => openRoom(room)} room={room} />)}
    </section>
  );
}

function ChatRoomCard({ hasNewMessage, onLeave, onOpen, room }: { hasNewMessage: boolean; onLeave: () => void; onOpen: () => void; room: D1ChatRoom }) {
  const title = room.title ?? '새 채팅방';
  const unreadCount = Number(room.unread_count ?? 0);
  const shouldHighlight = hasNewMessage || unreadCount > 0;

  return (
    <Card className={shouldHighlight ? 'person-card chat-room-card has-new-message' : 'person-card chat-room-card'}>
      <div className="talk-card-header">
        <div className="avatar-wrap">
          <span className="avatar">{title.slice(0, 1)}</span>
          <span className="status-dot is-online" />
        </div>
        <div>
          <strong>{title}{shouldHighlight ? <em className="chat-new-badge">{unreadCount > 0 ? `${unreadCount}개` : '새 메시지'}</em> : null}</strong>
          <p>{room.last_message ?? '아직 메시지가 없어요.'}</p>
        </div>
      </div>
      <div className="talk-actions">
        <span>{room.last_message_at ? '최근 대화 업데이트됨' : '최근 대화'}</span>
        <button type="button" onClick={onOpen}>열기</button>
        <button type="button" onClick={onLeave}>나가기</button>
      </div>
    </Card>
  );
}
