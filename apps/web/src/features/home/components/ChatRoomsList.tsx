import { useEffect, useRef, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { leaveD1ChatRoom, loadD1ChatRooms, type D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { POLLING_INTERVALS } from '../api/pollingIntervals';
import { ChatRoomPanel } from './ChatRoomPanel';
import { ProfilePreviewModal, type ProfilePreview } from './ProfilePreviewModal';
import './ChatLeaveConfirm.css';

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

function getRoomPeerProfile(room: D1ChatRoom): ProfilePreview {
  const myId = getProfileId();

  if (room.participant_a_id === myId && room.participant_b_id) {
    return { profile_id: room.participant_b_id, nickname: room.participant_b_nickname || room.title || '상대방' };
  }

  if (room.participant_b_id === myId && room.participant_a_id) {
    return { profile_id: room.participant_a_id, nickname: room.participant_a_nickname || room.title || '상대방' };
  }

  return { nickname: room.title ?? '상대방' };
}

export function ChatRoomsList({ initialRoom }: { initialRoom?: D1ChatRoom | null }) {
  const [rooms, setRooms] = useState<D1ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<D1ChatRoom | null>(initialRoom ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [newRoomIds, setNewRoomIds] = useState<Set<string>>(new Set());
  const [previewProfile, setPreviewProfile] = useState<ProfilePreview | null>(null);
  const [previewRoom, setPreviewRoom] = useState<D1ChatRoom | null>(null);
  const [leaveConfirmRoom, setLeaveConfirmRoom] = useState<D1ChatRoom | null>(null);
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
    setLeaveConfirmRoom(null);
    setRooms((current) => current.filter((item) => item.id !== room.id));
    setNewRoomIds((current) => {
      const next = new Set(current);
      next.delete(room.id);
      return next;
    });
    await leaveD1ChatRoom(room.id);
  };

  const previewRoomProfile = (room: D1ChatRoom) => {
    setPreviewRoom(room);
    setPreviewProfile(getRoomPeerProfile(room));
  };

  const openPreviewRoom = () => {
    if (!previewRoom) return;
    setPreviewProfile(null);
    setPreviewRoom(null);
    openRoom(previewRoom);
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
      {rooms.length === 0 && <Card className="person-card chat-empty-card"><strong>아직 대화가 없어요.</strong><p>토크나 사람 탭에서 마음에 드는 사람에게 먼저 대화를 걸어보세요.</p></Card>}
      {rooms.map((room) => <ChatRoomCard hasNewMessage={newRoomIds.has(room.id)} key={room.id} onLeave={() => setLeaveConfirmRoom(room)} onOpen={() => openRoom(room)} onPreview={() => previewRoomProfile(room)} room={room} />)}
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} onStartChat={openPreviewRoom} />}
      {leaveConfirmRoom && <LeaveConfirmDialog room={leaveConfirmRoom} onCancel={() => setLeaveConfirmRoom(null)} onConfirm={() => leaveRoom(leaveConfirmRoom)} />}
    </section>
  );
}

function LeaveConfirmDialog({ onCancel, onConfirm, room }: { onCancel: () => void; onConfirm: () => void; room: D1ChatRoom }) {
  return (
    <div className="chat-leave-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-leave-title">
      <div className="chat-leave-sheet">
        <strong id="chat-leave-title">채팅방을 나갈까요?</strong>
        <p>{room.title ?? '이 채팅방'}에서 나가면 내 목록에서 사라지고, 이전 대화 내용은 다시 볼 수 없어요.</p>
        <div className="chat-leave-actions">
          <button className="chat-leave-cancel" type="button" onClick={onCancel}>취소</button>
          <button className="chat-leave-confirm" type="button" onClick={onConfirm}>나가기</button>
        </div>
      </div>
    </div>
  );
}

function ChatRoomCard({ hasNewMessage, onLeave, onOpen, onPreview, room }: { hasNewMessage: boolean; onLeave: () => void; onOpen: () => void; onPreview: () => void; room: D1ChatRoom }) {
  const title = room.title ?? '새 채팅방';
  const unreadCount = Number(room.unread_count ?? 0);
  const shouldHighlight = hasNewMessage || unreadCount > 0;

  return (
    <Card className={shouldHighlight ? 'person-card chat-room-card has-new-message' : 'person-card chat-room-card'}>
      <div className="chat-room-card-layout">
        <div className="chat-room-card-main">
          <button className="profile-icon-button" type="button" onClick={onPreview}>
            <span className="avatar">{title.slice(0, 1)}</span>
            <span className="status-dot is-online" />
          </button>
          <div className="chat-room-card-copy">
            <strong>{title}{shouldHighlight ? <em className="chat-new-badge">{unreadCount > 0 ? `${unreadCount}개` : '새 메시지'}</em> : null}</strong>
            <p>{room.last_message ?? '아직 메시지가 없어요.'}</p>
            <span>{room.last_message_at ? '최근 대화 업데이트됨' : '최근 대화'}</span>
          </div>
        </div>
        <div className="chat-room-card-actions">
          <button type="button" onClick={onOpen}>열기</button>
          <button type="button" onClick={onLeave}>나가기</button>
        </div>
      </div>
    </Card>
  );
}
