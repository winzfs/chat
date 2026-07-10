import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { Modal } from '../../../shared/components/Modal';
import { leaveD1ChatRoom, loadD1ChatRooms, type D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { useChatRoomsPolling } from '../hooks/useChatRoomsPolling';
import { ChatRoomPanel } from './ChatRoomPanel';
import { ProfilePreviewModal, type ProfilePreview } from './ProfilePreviewModal';
import { UserAvatar } from './UserAvatar';
import './ChatLeaveConfirm.css';

function readRoomIdFromHash() {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get('room');
}

function writeRoomIdToHash(roomId: string) {
  window.location.hash = `room=${encodeURIComponent(roomId)}`;
}

function clearRoomHash() {
  if (window.location.hash.startsWith('#room=')) history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function getRoomPeerProfile(room: D1ChatRoom): ProfilePreview {
  const myId = getProfileId();
  if (room.participant_a_id === myId && room.participant_b_id) return { profile_id: room.participant_b_id, nickname: room.participant_b_nickname || room.title || '상대방', avatar_url: room.peer_avatar_url };
  if (room.participant_b_id === myId && room.participant_a_id) return { profile_id: room.participant_a_id, nickname: room.participant_a_nickname || room.title || '상대방', avatar_url: room.peer_avatar_url };
  return { nickname: room.title ?? '상대방', avatar_url: room.peer_avatar_url };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatRoomTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

type ChatRoomsListProps = {
  initialRoom?: D1ChatRoom | null;
  onRoomClosed?: () => void;
  onRoomStateChange?: (isOpen: boolean) => void;
};

export function ChatRoomsList({ initialRoom, onRoomClosed, onRoomStateChange }: ChatRoomsListProps) {
  const [rooms, setRooms] = useState<D1ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<D1ChatRoom | null>(initialRoom ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [previewProfile, setPreviewProfile] = useState<ProfilePreview | null>(null);
  const [previewRoom, setPreviewRoom] = useState<D1ChatRoom | null>(null);
  const [leaveConfirmRoom, setLeaveConfirmRoom] = useState<D1ChatRoom | null>(null);
  const [leavingRoomId, setLeavingRoomId] = useState('');
  const consumedInitialRoomId = useRef<string | null>(null);

  const loadRooms = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setErrorText('');
    try {
      const loadedRooms = await loadD1ChatRooms();
      setRooms(loadedRooms);

      if (initialRoom && consumedInitialRoomId.current !== initialRoom.id) {
        consumedInitialRoomId.current = initialRoom.id;
        setSelectedRoom(initialRoom);
        writeRoomIdToHash(initialRoom.id);
        onRoomStateChange?.(true);
        return;
      }

      const hashRoom = loadedRooms.find((room) => room.id === readRoomIdFromHash());
      if (hashRoom) {
        setSelectedRoom((current) => current ?? hashRoom);
        onRoomStateChange?.(true);
      }
    } catch (error) {
      setErrorText(errorMessage(error, '채팅 목록을 불러오지 못했어요.'));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [initialRoom, onRoomStateChange]);

  useEffect(() => {
    void loadRooms(true);
  }, [loadRooms]);

  useEffect(() => {
    onRoomStateChange?.(Boolean(selectedRoom));
  }, [onRoomStateChange, selectedRoom]);

  useChatRoomsPolling(!selectedRoom, () => loadRooms(false));

  const openRoom = (room: D1ChatRoom) => {
    writeRoomIdToHash(room.id);
    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, unread_count: 0 } : item));
    setSelectedRoom({ ...room, unread_count: 0 });
  };

  const closeRoom = () => {
    clearRoomHash();
    consumedInitialRoomId.current = initialRoom?.id ?? null;
    setSelectedRoom(null);
    onRoomStateChange?.(false);
    onRoomClosed?.();
  };

  const leaveRoom = async (room: D1ChatRoom) => {
    if (leavingRoomId) return;
    setLeavingRoomId(room.id);
    setErrorText('');
    try {
      const left = await leaveD1ChatRoom(room.id);
      if (!left) {
        setErrorText('채팅방을 나가지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      clearRoomHash();
      if (selectedRoom?.id === room.id) setSelectedRoom(null);
      setRooms((current) => current.filter((item) => item.id !== room.id));
      setLeaveConfirmRoom(null);
      onRoomStateChange?.(false);
    } catch (error) {
      setErrorText(errorMessage(error, '채팅방을 나가지 못했어요.'));
    } finally {
      setLeavingRoomId('');
    }
  };

  const previewRoomProfile = (room: D1ChatRoom) => {
    setPreviewRoom(room);
    setPreviewProfile(getRoomPeerProfile(room));
  };

  const openPreviewRoom = () => {
    if (!previewRoom) return;
    const room = previewRoom;
    setPreviewProfile(null);
    setPreviewRoom(null);
    openRoom(room);
  };

  if (selectedRoom) return <ChatRoomPanel room={selectedRoom} onClose={closeRoom} />;
  if (isLoading) return <section className="talk-list" aria-label="채팅 목록"><Card className="person-card chat-empty-card"><strong>채팅 목록을 불러오는 중...</strong><p>잠시만 기다려주세요.</p></Card></section>;

  const totalUnread = rooms.reduce((sum, room) => sum + Number(room.unread_count ?? 0), 0);

  return (
    <section className="talk-list chat-room-list" aria-label="채팅 목록">
      <div className="chat-list-summary"><div><strong>내 채팅</strong><p>{rooms.length}개의 대화</p></div>{totalUnread > 0 && <span>{totalUnread}개 안 읽음</span>}</div>
      {errorText && <Card className="settings-summary inline-error-card"><strong role="alert">{errorText}</strong><button type="button" onClick={() => void loadRooms(true)}>다시 불러오기</button></Card>}
      {rooms.length === 0 && !errorText && <Card className="person-card chat-empty-card"><strong>아직 대화가 없어요.</strong><p>토크나 사람 탭에서 마음에 드는 사람에게 먼저 말을 걸어보세요.</p></Card>}
      {rooms.map((room) => <ChatRoomCard key={room.id} onLeave={() => setLeaveConfirmRoom(room)} onOpen={() => openRoom(room)} onPreview={() => previewRoomProfile(room)} room={room} />)}
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} onStartChat={openPreviewRoom} />}
      {leaveConfirmRoom && <LeaveConfirmDialog isLeaving={leavingRoomId === leaveConfirmRoom.id} room={leaveConfirmRoom} onCancel={() => setLeaveConfirmRoom(null)} onConfirm={() => void leaveRoom(leaveConfirmRoom)} />}
    </section>
  );
}

function LeaveConfirmDialog({ isLeaving, onCancel, onConfirm, room }: { isLeaving: boolean; onCancel: () => void; onConfirm: () => void; room: D1ChatRoom }) {
  return <Modal backdropClassName="chat-leave-overlay" labelledBy="chat-leave-title" onClose={onCancel} preventClose={isLeaving}><div className="chat-leave-sheet"><strong id="chat-leave-title">채팅방을 나갈까요?</strong><p>{room.title ?? '이 채팅방'}에서 나가면 내 목록에서 사라져요.</p><div className="chat-leave-actions"><button className="chat-leave-cancel" disabled={isLeaving} type="button" onClick={onCancel}>취소</button><button className="chat-leave-confirm" disabled={isLeaving} type="button" onClick={onConfirm}>{isLeaving ? '나가는 중...' : '나가기'}</button></div></div></Modal>;
}

function ChatRoomCard({ onLeave, onOpen, onPreview, room }: { onLeave: () => void; onOpen: () => void; onPreview: () => void; room: D1ChatRoom }) {
  const title = room.title ?? '새 채팅방';
  const unreadCount = Number(room.unread_count ?? 0);
  return (
    <article className={unreadCount > 0 ? 'chat-list-item has-new-message' : 'chat-list-item'}>
      <button aria-label={`${title} 채팅방 열기`} className="chat-list-open" type="button" onClick={onOpen}>
        <span className="chat-list-avatar" onClick={(event) => { event.stopPropagation(); onPreview(); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onPreview(); } }}><UserAvatar imageUrl={room.peer_avatar_url} name={title} /></span>
        <span className="chat-list-copy"><span className="chat-list-title-row"><strong>{title}</strong><time>{formatRoomTime(room.last_message_at)}</time></span><span className="chat-list-preview-row"><span>{room.last_message ?? '아직 메시지가 없어요.'}</span>{unreadCount > 0 && <em>{unreadCount > 99 ? '99+' : unreadCount}</em>}</span></span>
      </button>
      <button aria-label={`${title} 채팅방 나가기`} className="chat-list-more" type="button" onClick={onLeave}>⋯</button>
    </article>
  );
}
