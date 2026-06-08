import { Card } from '../../../shared/components/Card';
import type { recommendedUsers } from '../data/homeMockData';

type RecommendedUser = (typeof recommendedUsers)[number];

export function ProfilePreviewModal({ onClose, onStartChat, user }: { user: RecommendedUser; onClose: () => void; onStartChat: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <Card className="profile-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="avatar-wrap">
          <span className="avatar">{user.nickname.slice(0, 1)}</span>
          <span className={user.online ? 'status-dot is-online' : 'status-dot'} />
        </div>
        <strong>{user.nickname}</strong>
        <p>{user.age}세 · {user.location} · 취향 매칭 {user.matchRate}%</p>
        <p>가벼운 대화와 취미 공유를 좋아해요. 먼저 인사해보세요.</p>
        <div className="talk-actions">
          <button type="button" onClick={onClose}>닫기</button>
          <button type="button" onClick={onStartChat}>채팅 시작</button>
        </div>
      </Card>
    </div>
  );
}
