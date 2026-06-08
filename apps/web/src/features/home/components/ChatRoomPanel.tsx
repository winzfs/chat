import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { loadD1ChatMessages, sendD1ChatMessage, type D1ChatMessage } from '../api/d1ChatMessages';
import type { D1ChatRoom } from '../api/d1ChatRooms';

export function ChatRoomPanel({ room, onClose }: { room: D1ChatRoom; onClose: () => void }) {
  const [messages, setMessages] = useState<D1ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadD1ChatMessages(room.id).then(setMessages);
  }, [room.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = text.trim();

    if (!body || isSending) return;

    setIsSending(true);
    const saved = await sendD1ChatMessage(room.id, body);
    setIsSending(false);

    if (saved) {
      setMessages((current) => [...current, saved]);
      setText('');
    }
  };

  return (
    <section className="talk-list" aria-label="채팅방">
      <Card className="settings-summary">
        <button type="button" onClick={onClose}>← 목록</button>
        <strong>{room.title ?? '새 채팅방'}</strong>
        <p>{messages.length}개 메시지</p>
      </Card>

      <div className="talk-list">
        {messages.length === 0 && (
          <Card className="person-card">
            <strong>아직 메시지가 없어요</strong>
            <p>첫 메시지를 보내서 대화를 시작해보세요.</p>
          </Card>
        )}

        {messages.map((message) => (
          <Card className="person-card" key={message.id}>
            <div className="talk-card-header">
              <div className="avatar-wrap">
                <span className="avatar">{message.sender_nickname.slice(0, 1)}</span>
                <span className="status-dot is-online" />
              </div>
              <div>
                <strong>{message.sender_nickname}</strong>
                <p>{message.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <form className="quick-compose" onSubmit={handleSubmit}>
        <input
          aria-label="메시지 입력"
          maxLength={500}
          onChange={(event) => setText(event.target.value)}
          placeholder="메시지를 입력하세요"
          value={text}
        />
        <Button disabled={isSending || text.trim().length === 0} type="submit">
          보내기
        </Button>
      </form>
    </section>
  );
}
