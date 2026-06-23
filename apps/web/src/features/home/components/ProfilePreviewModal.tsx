import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { loadProfile } from '../api/profileLookup';
import { UserAvatar } from './UserAvatar';
import './ProfilePreviewModal.css';

export type ProfilePreview = {
  profile_id?: string | null;
  nickname: string;
  age?: number | string | null;
  location?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

export function ProfilePreviewModal({ onClose, onStartChat, profile }: { profile: ProfilePreview; onClose: () => void; onStartChat?: () => void }) {
  const [displayProfile, setDisplayProfile] = useState(profile);

  useEffect(() => {
    let isMounted = true;
    setDisplayProfile(profile);

    loadProfile(profile.profile_id, profile.nickname)
      .then((loaded) => {
        if (!isMounted || !loaded) return;
        setDisplayProfile({
          profile_id: loaded.id ?? profile.profile_id,
          nickname: loaded.nickname || profile.nickname,
          age: loaded.age ?? profile.age,
          location: loaded.location ?? profile.location,
          bio: loaded.bio ?? profile.bio,
          avatar_url: loaded.avatar_url ?? profile.avatar_url,
        });
      })
      .catch(() => {
        // Keep the profile data already available in the list.
      });

    return () => {
      isMounted = false;
    };
  }, [profile]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop profile-preview-backdrop" role="presentation" onClick={onClose}>
      <Card className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-preview-title" onClick={(event) => event.stopPropagation()}>
        <div className="profile-preview-avatar">
          <UserAvatar imageUrl={displayProfile.avatar_url} name={displayProfile.nickname} />
        </div>
        <strong id="profile-preview-title">{displayProfile.nickname}</strong>
        <p>{displayProfile.age ?? '-'}세 · {displayProfile.location || '지역 없음'}</p>
        <p>{displayProfile.bio || '소개글이 아직 없어요.'}</p>
        <div className="profile-modal-actions">
          <button autoFocus type="button" onClick={onClose}>닫기</button>
          {onStartChat && <button type="button" onClick={onStartChat}>채팅 시작</button>}
        </div>
      </Card>
    </div>
  );
}
