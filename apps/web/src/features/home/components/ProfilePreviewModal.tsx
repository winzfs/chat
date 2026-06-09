import { Card } from '../../../shared/components/Card';
import { UserAvatar } from './UserAvatar';

export type ProfilePreview = {
  nickname: string;
  age?: number | string | null;
  location?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

export function ProfilePreviewModal({ onClose, onStartChat, profile }: { profile: ProfilePreview; onClose: () => void; onStartChat?: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <Card className="profile-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="profile-preview-avatar">
          <UserAvatar imageUrl={profile.avatar_url} name={profile.nickname} />
        </div>
        <strong>{profile.nickname}</strong>
        <p>{profile.age ?? '-'}세 · {profile.location || '내 주변'}</p>
        <p>{profile.bio || '소개글이 아직 없어요.'}</p>
        <div className="talk-actions">
          <button type="button" onClick={onClose}>닫기</button>
          {onStartChat && <button type="button" onClick={onStartChat}>채팅 시작</button>}
        </div>
      </Card>
    </div>
  );
}
