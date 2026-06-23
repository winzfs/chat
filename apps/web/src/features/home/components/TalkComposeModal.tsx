import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import './TalkComposeModal.css';

export type TalkComposeValues = {
  text: string;
  mood: string;
};

type TalkComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TalkComposeValues) => Promise<boolean>;
};

export function TalkComposeModal({ isOpen, onClose, onSubmit }: TalkComposeModalProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedText = text.trim();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!trimmedText || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const submitted = await onSubmit({ text: trimmedText, mood: '가벼운 수다' });
      if (submitted) setText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal labelledBy="compose-modal-title" onClose={onClose} preventClose={isSubmitting}>
      <section className="compose-modal">
        <header className="compose-modal-header">
          <div>
            <p>한줄 토크</p>
            <h2 id="compose-modal-title">지금 하고 싶은 말을 남겨보세요</h2>
          </div>
          <button className="modal-close-button" disabled={isSubmitting} type="button" aria-label="닫기" onClick={onClose}>×</button>
        </header>

        <label className="compose-field">
          <span>내용 · {text.length}/80</span>
          <textarea autoFocus disabled={isSubmitting} value={text} maxLength={80} placeholder="예: 오늘 카페에서 수다 떨 사람 있나요?" rows={4} onChange={(event) => setText(event.target.value)} />
        </label>

        <div className="compose-modal-actions">
          <Button disabled={isSubmitting} variant="secondary" onClick={onClose}>취소</Button>
          <Button disabled={!trimmedText || isSubmitting} onClick={handleSubmit}>{isSubmitting ? '등록 중...' : '등록하기'}</Button>
        </div>
      </section>
    </Modal>
  );
}
