import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { Modal } from '../../../shared/components/Modal';
import { leaveD1ChatRoom, loadD1ChatRooms, type D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { POLLING_INTERVALS } from '../api/pollingIntervals';
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
  if (window.location.hash.startsWith('#room=')) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

function getRoomPeerProfile(room: D1ChatRoom): ProfilePreview {
  const myId = getProfileId();

  if (room.participant_a_id === myId && room.participant_b_id) {
    return { profile_id: room.participant_b_id, nickname: room.participant_b_nickname || room.title || '상대방', avatar_url: room.peer_avatar_url };
  }

  if (room.participant_b_id === myId && room.participant_a_id) {
    return { profile_id: room.participant_a_id, nickname: room.participant_a_nickname || room.title || '상대방', avatar_url: room.peer_avatar_url };
  }

  return { nickname: room.title ?? '상대방', avatar_url: room.peer_avatar_url };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatRoomTime(value?: string | null) {
  if (!value) return '최근 대화 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근 대화 업데이트됨';
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ChatRoomsList({ initialRoom }: { initialRoom?: D1ChatRoom | null }) {
  const [rooms, setRooms] = useState<D1ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<D1ChatRoom | null>(initialRoom ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [previewProfile, setPreviewProfile] = useState<ProfilePreview | null>(null);
  const [previewRoom, setPreviewRoom] = useState<D1ChatRoom | null>(null);
  const [leaveConfirmRoom, setLeaveConfirmRoom] = useState<D1ChatRoom | null>(null);
  const [leavingRoomId, setLeavingRoomId] = useState('');

  const loadRooms = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setErrorText('');

    try {
      const loadedRooms = await loadD1ChatRooms();
      setRooms(loadedRooms);

      if (initialRoom) {
        setSelectedRoom(initialRoom);
        writeRoomIdToHash(initialRoom.id);
        return;
      }

      const hashRoom = loadedRooms.find((room) => room.id === readRoomIdFromHash());
      if (hashRoom) setSelectedRoom((current) => current ?? hashRoom);
    } catch (error) {
      setErrorText(errorMessage(error, '채팅 목록을 불러오지 못했어요.'));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [initialRoom]);

  useEffect(() => {
    void loadRooms(true);
  }, [loadRooms]);

  useEffect(() => {
    if (selectedRoom) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) void loadRooms(false);
    }, POLLING_INTERVALS.chatRooms);

    return () => window.clearInterval(timer);
  }, [loadRooms, selectedRoom]);

  const openRoom = (room: D1ChatRoom) => {
    writeRoomIdToHash(room.id);
    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, unread_count: 0 } : item));
    setSelectedRoom({ ...room, unread_count: 0 });
  };

  const closeRoom = () => {
    clearRoomHash();
    setSelectedRoom(null);
    void loadRooms(true);
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
    setPreviewProfile(null);
    setPreviewRoom(null);
    openRoom(previewRoom);
  };

  if (selectedRoom) return <ChatRoomPanel room={selectedRoom} onClose={closeRoom} />;
  if (isLoading) return <section className="talk-list" aria-label="채팅 목록"><Card className="person-card"><strong>채팅 목록을 불러오는 중...</strong></Card></section>;

  const totalUnread = rooms.reduce((sum, room) => sum + Number(room.unread_count ?? 0), 0);

  return (
    <section className="talk-list" aria-label="채팅 목록">
      <Card className="settings-summary">
        <strong>내 채팅 목록</strong>
        <p>{rooms.length}개 채팅방 · 안 읽은 메시지 {totalUnread}개</p>
      </Card>
      {errorText && (
        <Card className="settings-summary">
          <strong role="alert">{errorText}</strong>
          <button type="button" onClick={() => void loadRooms(true)}>다시 불러오기</button>
        </Card>
      )}
      {rooms.length === 0 && !errorText && <Card className="person-card chat-empty-card"><strong>아직 대화가 없어요.</strong><p>토크나 사람 탭에서 마음에 드는 사람에게 먼저 대화를 걸어보세요.</p></Card>}
      {rooms.map((room) => <ChatRoomCard key={room.id} onLeave={() => setLeaveConfirmRoom(room)} onOpen={() => openRoom(room)} onPreview={() => previewRoomProfile(room)} room={room} />)}
      {previewProfile && <ProfilePreviewModal profile={previewProfile} onClose={() => setPreviewProfile(null)} onStartChat={openPreviewRoom} />}
      {leaveConfirmRoom && <LeaveConfirmDialog isLeaving={leavingRoomId === leaveConfirmRoom.id} room={leaveConfirmRoom} onCancel={() => setLeaveConfirmRoom(null)} onConfirm={() => void leaveRoom(leaveConfirmRoom)} />}
    </section>
  );
}

function LeaveConfirmDialog({ isLeaving, onCancel, onConfirm, room }: { isLeaving: boolean; onCancel: () => void; onConfirm: () => void; room: D1ChatRoom }) {
  return (
    <Modal backdropClassName="chat-leave-overlay" labelledBy="chat-leave-title" onClose={onCancel} preventClose={isLeaving}>
      <div className="chat-leave-sheet">
        <strong id="chat-leave-title">채팅방을 나갈까요?</strong>
        <p>{room.title ?? '이 채팅방'}에서 나가면 내 목록에서 사라져요.</p>
        <div className="chat-leave-actions">
          <button className="chat-leave-cancel" disabled={isLeaving} type="button" onClick={onCancel}>취소</button>
          <button className="chat-leave-confirm" disabled={isLeaving} type="button" onClick={onConfirm}>{isLeaving ? '나가는 중...' : '나가기'}</button>
        </div>
      </div>
    </Modal>
  );
}

function ChatRoomCard({ onLeave, onOpen, onPreview, room }: { onLeave: () => void; onOpen: () => void; onPreview: () => void; room: D1ChatRoom }) {
  const title = room.title ?? '새 채팅방';
  const unreadCount = Number(room.unread_count ?? 0);
  const shouldHighlight = unreadCount > 0;

  return (
    <Card className={shouldHighlight ? 'person-card chat-room-card has-new-message' : 'person-card chat-room-card'}>
      <div className="chat-room-card-layout">
        <div className="chat-room-card-main">
          <button aria-label={`${title} 프로필 보기`} className="profile-icon-button" type="button" onClick={onPreview}>
            <UserAvatar imageUrl={room.peer_avatar_url} name={title} />
          </button>
          <div className="chat-room-card-copy">
            <strong>{title}{shouldHighlight ? <em className="chat-new-badge">{unreadCount}개</em> : null}</strong>
            <p>{room.last_message ?? '아직 메시지가 없어요.'}</p>
            <span>{formatRoomTime(room.last_message_at)}</span>
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
