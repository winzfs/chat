import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadMyRoom, createDefaultMyRoom, type MyRoom } from '../api/myRoom';
import type { D1ChatMessage } from '../api/d1ChatMessages';
import type { D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { loadMyProfile } from '../api/profileStorage';
import { getPeerFromRoom } from '../api/userSafety';
import { RoomCanvas, type RoomCharacter } from './RoomCanvas';
import './ChatRoomGameScene.css';

function messageText(message?: D1ChatMessage) {
  if (!message) return '';
  if (message.message_type === 'image') return '사진을 보냈어요 📷';
  return message.body?.slice(0, 44) ?? '';
}

function findLatestMessages(messages: D1ChatMessage[], myId: string, myNickname: string) {
  let mine: D1ChatMessage | undefined;
  let theirs: D1ChatMessage | undefined;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const isMine = message.sender_profile_id ? message.sender_profile_id === myId : message.sender_nickname === myNickname;

    if (isMine && !mine) {
      mine = message;
    }

    if (!isMine && !theirs) {
      theirs = message;
    }

    if (mine && theirs) break;
  }

  return { mine, theirs };
}

export function ChatRoomGameScene({ messages, room }: { messages: D1ChatMessage[]; room: D1ChatRoom }) {
  const myId = useMemo(() => getProfileId(), []);
  const myProfile = useMemo(() => loadMyProfile(), []);
  const peer = useMemo(() => getPeerFromRoom(room), [room]);
  const roomOwnerId = room.room_owner_profile_id || room.participant_a_id || myId;
  const roomOwnerName = room.room_owner_nickname || room.participant_a_nickname || myProfile.nickname;
  const isMyRoom = roomOwnerId === myId;
  const [myRoom, setMyRoom] = useState<MyRoom>(() => createDefaultMyRoom(roomOwnerId));
  const [myPosition, setMyPosition] = useState({ x: isMyRoom ? 34 : 70, y: 74 });

  useEffect(() => {
    let isMounted = true;
    loadMyRoom(roomOwnerId).then((nextRoom) => {
      if (isMounted) setMyRoom(nextRoom);
    });

    return () => {
      isMounted = false;
    };
  }, [roomOwnerId]);

  useEffect(() => {
    setMyPosition({ x: isMyRoom ? 34 : 70, y: 74 });
  }, [isMyRoom, room.id]);

  const moveMyCharacter = useCallback((position: { x: number; y: number }) => {
    setMyPosition({ x: position.x, y: Math.max(position.y, 42) });
  }, []);

  const characters = useMemo<RoomCharacter[]>(() => {
    const { mine, theirs } = findLatestMessages(messages, myId, myProfile.nickname);

    const baseCharacters: RoomCharacter[] = [
      {
        id: 'me',
        label: myProfile.nickname || '나',
        x: myPosition.x,
        y: myPosition.y,
        variant: 'me',
        bubble: messageText(mine),
      },
    ];

    if (peer) {
      baseCharacters.push({
        id: 'peer',
        label: peer.nickname,
        x: isMyRoom ? 70 : 34,
        y: 74,
        variant: 'peer',
        bubble: messageText(theirs),
      });
    }

    return baseCharacters;
  }, [isMyRoom, messages, myId, myPosition.x, myPosition.y, myProfile.nickname, peer]);

  const footer = useMemo(
    () => <span className="game-scene-hint">가구·벽지·액자는 설정 탭의 마이룸 꾸미기에서 바꿀 수 있어요.</span>,
    [],
  );

  return (
    <section className="chat-room-game-scene" aria-label="마이룸 채팅 화면">
      <div className="game-scene-title-row">
        <div>
          <strong>{roomOwnerName}님의 마이룸</strong>
          <p>{isMyRoom ? '내 방에서 대화 중이에요.' : '대화를 신청한 사람의 방에서 대화 중이에요.'}</p>
        </div>
        <span>터치해서 이동</span>
      </div>

      <RoomCanvas
        characters={characters}
        footer={footer}
        onStageClick={moveMyCharacter}
        room={myRoom}
      />
    </section>
  );
}
