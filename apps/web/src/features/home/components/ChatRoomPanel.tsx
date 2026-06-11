import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { compressImageToWebp } from '../../../shared/lib/compressImage';
import { loadD1ChatMessages, sendD1ChatImage, sendD1ChatMessage, type D1ChatMessage } from '../api/d1ChatMessages';
import type { D1ChatRoom } from '../api/d1ChatRooms';
import { blockUser, getPeerFromRoom, reportUser } from '../api/userSafety';
import { useMessagePolling } from '../api/useMessagePolling';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatRoomGameScene } from './ChatRoomGameScene';
import './ChatRoomPanel.css';

function previewMessageText(message: D1ChatMessage) {
  if (message.message_type === 'image') return '사진을 보냈어요 📷';
  return message.body?.trim() || '내용 없는 메시지';
}

function formatPreviewTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ChatRoomPanel({ room, onClose }: { room: D1ChatRoom; onClose: () => void }) {
  const [messages, setMessages] = useState<D1ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const peer = getPeerFromRoom(room);
  const previewMessages = useMemo(() => messages.slice(-3), [messages]);

  useEffect(() => {
    loadD1ChatMessages(room.id).then(setMessages);
  }, [room.id]);

  useMessagePolling(room.id, setMessages);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = text.trim();

    if (!body || isSending) return;

    setIsSending(true);
    setErrorText('');
    const saved = await sendD1ChatMessage(room.id, body);
    setIsSending(false);

    if (saved) {
      setMessages((current) => [...current, saved]);
      setText('');
      return;
    }

    setErrorText('메시지를 보내지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    event.target.value = '';

    if (!image || isSending) return;

    setIsSending(true);
    setErrorText('');
    setUploadStatus('이미지를 압축하는 중...');

    try {
      const compressedImage = await compressImageToWebp(image);
      setUploadStatus(`압축 완료: ${Math.round(compressedImage.size / 1024)}KB`);
      const saved = await sendD1ChatImage(room.id, compressedImage);

      if (saved) {
        setMessages((current) => [...current, saved]);
        return;
      }

      setErrorText('이미지를 보내지 못했어요. 잠시 후 다시 시도해주세요.');
    } catch {
      setErrorText('이미지를 처리하지 못했어요. 다른 사진으로 다시 시도해주세요.');
    } finally {
      setIsSending(false);
      setUploadStatus('');
    }
  };

  const handleReport = async () => {
    if (!peer) {
      setErrorText('신고할 상대 정보를 찾지 못했어요.');
      return;
    }

    const ok = await reportUser(peer.id, peer.nickname, room.id);
    setErrorText(ok ? '신고가 접수됐어요.' : '신고를 접수하지 못했어요.');
  };

  const handleBlock = async () => {
    if (!peer) {
      setErrorText('차단할 상대 정보를 찾지 못했어요.');
      return;
    }

    const ok = await blockUser(peer.id, peer.nickname);
    if (ok) {
      setErrorText(`${peer.nickname}님을 차단했어요. 목록에서 더 이상 보이지 않아요.`);
      onClose();
      return;
    }

    setErrorText('차단하지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  return (
    <section className="talk-list chat-room-view" aria-label="채팅방">
      <Card className="settings-summary chat-room-header-card">
        <div className="chat-room-header-main">
          <button className="chat-back-button" type="button" onClick={onClose}>←</button>
          <div>
            <strong>{room.title ?? '새 채팅방'}</strong>
            <p>{uploadStatus || `${messages.length}개 메시지 · 마이룸 채팅 중`}</p>
          </div>
        </div>
        <div className="talk-actions chat-room-safety-actions">
          <button type="button" onClick={() => setIsHistoryOpen(true)}>기록</button>
          <button type="button" onClick={handleReport}>신고</button>
          <button type="button" onClick={handleBlock}>차단</button>
        </div>
        {errorText && <p className="error-text">{errorText}</p>}
      </Card>

      <ChatRoomGameScene messages={messages} room={room} />

      <div className="chat-room-preview-box" aria-label="최근 채팅 미리보기">
        {previewMessages.length === 0 ? (
          <div className="chat-room-preview-row"><span className="chat-room-preview-body">아직 메시지가 없어요.</span></div>
        ) : previewMessages.map((message) => (
          <div className="chat-room-preview-row" key={message.id}>
            <span className="chat-room-preview-body"><b>{message.sender_nickname}:</b> {previewMessageText(message)}</span>
            <span className="chat-room-preview-time">{formatPreviewTime(message.created_at)}</span>
          </div>
        ))}
      </div>

      {isHistoryOpen && (
        <div className="chat-history-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-history-title">
          <div className="chat-history-backdrop" onClick={() => setIsHistoryOpen(false)} />
          <Card className="person-card chat-history-sheet">
            <div className="chat-history-sheet-header">
              <div>
                <strong id="chat-history-title">대화 기록</strong>
                <p>{messages.length}개 메시지</p>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen(false)}>닫기</button>
            </div>
            <div className="talk-list chat-message-list chat-history-scroll">
              {messages.length === 0 && <Card className="person-card"><strong>아직 메시지가 없어요</strong><p>첫 메시지를 보내서 대화를 시작해보세요.</p></Card>}
              {messages.map((message) => <ChatMessageItem key={message.id} message={message} />)}
            </div>
          </Card>
        </div>
      )}

      <form className="quick-compose chat-compose-bar" onSubmit={handleSubmit}>
        <input aria-label="메시지 입력" maxLength={500} onChange={(event) => setText(event.target.value)} placeholder="말풍선으로 띄울 메시지" value={text} />
        <label className="secondary-button">사진<input accept="image/*" hidden onChange={handleImageChange} type="file" /></label>
        <Button disabled={isSending || text.trim().length === 0} type="submit">보내기</Button>
      </form>
    </section>
  );
}
