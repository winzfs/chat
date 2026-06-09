import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import './TalkComposeModal.css';

export type TalkComposeValues = {
  text: string;
  mood: string;
};

type TalkComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TalkComposeValues) => void;
};

export function TalkComposeModal({ isOpen, onClose, onSubmit }: TalkComposeModalProps) {
  const [text, setText] = useState('');
  const trimmedText = text.trim();

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (!trimmedText) {
      return;
    }

    onSubmit({ text: trimmedText, mood: '가벼운 수다' });
    setText('');
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="compose-modal" aria-labelledby="compose-modal-title" role="dialog" aria-modal="true">
        <header className="compose-modal-header">
          <div>
            <p>한줄 토크</p>
            <h2 id="compose-modal-title">지금 하고 싶은 말을 남겨보세요</h2>
          </div>
          <button className="modal-close-button" type="button" aria-label="닫기" onClick={onClose}>×</button>
        </header>

        <label className="compose-field">
          <span>내용 · {text.length}/80</span>
          <textarea value={text} maxLength={80} placeholder="예: 오늘 카페에서 수다 떨 사람 있나요?" rows={4} onChange={(event) => setText(event.target.value)} />
        </label>

        <div className="compose-modal-actions">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button disabled={!trimmedText} onClick={handleSubmit}>등록하기</Button>
        </div>
      </section>
    </div>
  );
}
