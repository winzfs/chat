import { useState } from 'react';
import { Card } from '../../../shared/components/Card';
import type { D1ChatMessage } from '../api/d1ChatMessages';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageItem({ message }: { message: D1ChatMessage }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const isMe = message.sender_nickname === '나';

  return (
    <>
      <Card className={isMe ? 'person-card chat-message is-me' : 'person-card chat-message'}>
        <div className="talk-card-header">
          <div className="avatar-wrap">
            <span className="avatar">{message.sender_nickname.slice(0, 1)}</span>
            <span className="status-dot is-online" />
          </div>
          <div>
            <strong>{message.sender_nickname}</strong>
            <span className="message-time">{formatTime(message.created_at)}</span>
            {message.message_type === 'image' && message.image_url ? (
              <button className="image-message-button" type="button" onClick={() => setPreviewImage(message.image_url)}>
                <img alt="채팅 이미지" src={message.image_url} />
              </button>
            ) : (
              <p>{message.body}</p>
            )}
          </div>
        </div>
      </Card>

      {previewImage && (
        <button className="image-preview-backdrop" type="button" onClick={() => setPreviewImage(null)}>
          <img alt="확대 이미지" src={previewImage} />
        </button>
      )}
    </>
  );
}
