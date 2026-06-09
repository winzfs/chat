import { useState } from 'react';
import { Card } from '../../../shared/components/Card';
import type { D1ChatMessage } from '../api/d1ChatMessages';
import { getProfileId } from '../api/profileId';
import { loadMyProfile } from '../api/profileStorage';
import { ProfilePreviewModal } from './ProfilePreviewModal';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function isMyMessage(message: D1ChatMessage) {
  if (message.sender_profile_id) {
    return message.sender_profile_id === getProfileId();
  }

  return message.sender_nickname === loadMyProfile().nickname;
}

export function ChatMessageItem({ message }: { message: D1ChatMessage }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isMe = isMyMessage(message);
  const nickname = isMe ? loadMyProfile().nickname : message.sender_nickname || '상대방';

  return (
    <>
      <Card className={isMe ? 'person-card chat-message is-me' : 'person-card chat-message'}>
        <div className="message-bubble-body">
          <button className="message-profile-button" type="button" onClick={() => setIsProfileOpen(true)}>{nickname.slice(0, 1)}</button>
          <span className="message-time">{formatTime(message.created_at)}</span>
          {message.message_type === 'image' && message.image_url ? (
            <button className="image-message-button" type="button" onClick={() => setPreviewImage(message.image_url)}>
              <img alt="채팅 이미지" src={message.image_url} />
            </button>
          ) : (
            <p>{message.body}</p>
          )}
        </div>
      </Card>

      {isProfileOpen && <ProfilePreviewModal profile={{ nickname }} onClose={() => setIsProfileOpen(false)} />}

      {previewImage && (
        <button className="image-preview-backdrop" type="button" onClick={() => setPreviewImage(null)}>
          <img alt="확대 이미지" src={previewImage} />
        </button>
      )}
    </>
  );
}
