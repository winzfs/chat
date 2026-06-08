import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import './TalkComposeModal.css';

type TalkComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const moodOptions = ['가벼운 수다', '취미 공유', '고민 상담', '오늘의 기분'];

export function TalkComposeModal({ isOpen, onClose }: TalkComposeModalProps) {
  const [selectedMood, setSelectedMood] = useState(moodOptions[0]);

  if (!isOpen) {
    return null;
  }

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
          <span>내용</span>
          <textarea maxLength={80} placeholder="예: 오늘 카페에서 수다 떨 사람 있나요?" rows={4} />
        </label>

        <div className="compose-field">
          <span>분위기</span>
          <div className="mood-chip-list">
            {moodOptions.map((mood) => (
              <button
                className={selectedMood === mood ? 'mood-chip is-selected' : 'mood-chip'}
                key={mood}
                type="button"
                onClick={() => setSelectedMood(mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <div className="compose-modal-actions">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={onClose}>등록하기</Button>
        </div>
      </section>
    </div>
  );
}
