import { useEffect, useMemo, useState } from 'react';
import { loadMyRoom, createDefaultMyRoom, type MyRoom } from '../api/myRoom';
import type { D1ChatMessage } from '../api/d1ChatMessages';
import type { D1ChatRoom } from '../api/d1ChatRooms';
import { getProfileId } from '../api/profileId';
import { loadMyProfile } from '../api/profileStorage';
import { getPeerFromRoom } from '../api/userSafety';
import { RoomCanvas, type RoomCharacter } from './RoomCanvas';
import './ChatRoomGameScene.css';

function isMyMessage(message: D1ChatMessage) {
  if (message.sender_profile_id) {
    return message.sender_profile_id === getProfileId();
  }

  return message.sender_nickname === loadMyProfile().nickname;
}

function messageText(message?: D1ChatMessage) {
  if (!message) return '';
  if (message.message_type === 'image') return '사진을 보냈어요 📷';
  return message.body?.slice(0, 44) ?? '';
}

function latestMessage(messages: D1ChatMessage[], fromMe: boolean) {
  return [...messages].reverse().find((message) => isMyMessage(message) === fromMe);
}

export function ChatRoomGameScene({ messages, room }: { messages: D1ChatMessage[]; room: D1ChatRoom }) {
  const myProfile = loadMyProfile();
  const peer = getPeerFromRoom(room);
  const roomOwnerId = room.room_owner_profile_id || room.participant_a_id || getProfileId();
  const roomOwnerName = room.room_owner_nickname || room.participant_a_nickname || myProfile.nickname;
  const isMyRoom = roomOwnerId === getProfileId();
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

  const characters = useMemo<RoomCharacter[]>(() => {
    const mine = latestMessage(messages, true);
    const theirs = latestMessage(messages, false);

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
  }, [isMyRoom, messages, myPosition.x, myPosition.y, myProfile.nickname, peer]);

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
        footer={<span className="game-scene-hint">가구·벽지·액자는 설정 탭의 마이룸 꾸미기에서 바꿀 수 있어요.</span>}
        onStageClick={(position) => setMyPosition({ x: position.x, y: Math.max(position.y, 42) })}
        room={myRoom}
      />
    </section>
  );
}
