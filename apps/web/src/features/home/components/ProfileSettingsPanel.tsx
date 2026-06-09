import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { getProfileId } from '../api/profileId';
import type { MyProfile } from '../api/profileStorage';
import { AvatarCropModal } from './AvatarCropModal';

async function uploadAvatar(image: File) {
  const formData = new FormData();
  formData.append('profile_id', getProfileId());
  formData.append('image', image);

  const response = await fetch('/api/profile-image', { method: 'POST', body: formData });
  if (!response.ok) return null;

  const data = await response.json() as { avatar_url?: string };
  return data.avatar_url ?? null;
}

async function deleteAvatar(avatarUrl?: string) {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  if (avatarUrl) params.set('avatar_url', avatarUrl);

  const response = await fetch(`/api/profile-image?${params.toString()}`, { method: 'DELETE' });
  return response.ok;
}

export function ProfileSettingsPanel({ myProfile, onSave }: { myProfile: MyProfile; onSave: (profile: MyProfile) => void }) {
  const [form, setForm] = useState<MyProfile>(myProfile);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState('');

  useEffect(() => {
    setForm(myProfile);
  }, [myProfile]);

  useEffect(() => () => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
  }, [cropImageUrl]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(form);
  };

  const handleAvatarPick = (file?: File) => {
    if (!file) return;
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(URL.createObjectURL(file));
  };

  const uploadCroppedAvatar = async (file: File) => {
    setIsUploading(true);
    const avatarUrl = await uploadAvatar(file);
    setIsUploading(false);
    setCropImageUrl('');
    if (avatarUrl) {
      setForm((current) => ({ ...current, avatar_url: avatarUrl }));
    }
  };

  const resetAvatar = async () => {
    setIsUploading(true);
    await deleteAvatar(form.avatar_url);
    setIsUploading(false);
    setForm((current) => ({ ...current, avatar_url: '' }));
  };

  return (
    <section className="talk-list" aria-label="프로필 설정">
      <Card className="settings-summary profile-summary-card">
        <div className="profile-avatar-preview">
          {myProfile.avatar_url ? <img alt="프로필 사진" src={myProfile.avatar_url} /> : <span>{myProfile.nickname.slice(0, 1)}</span>}
        </div>
        <strong>{myProfile.nickname}님</strong>
        <p>{myProfile.age}세 · {myProfile.location}</p>
        <p>{myProfile.gender === 'female' ? '여성' : myProfile.gender === 'male' ? '남성' : '성별 선택 안 함'}</p>
        <p>{myProfile.bio}</p>
      </Card>

      <Card className="person-card">
        <form className="profile-form" onSubmit={handleSubmit}>
          <label>
            프로필 사진
            <div className="profile-photo-input-row">
              <div className="profile-avatar-preview is-small">
                {form.avatar_url ? <img alt="프로필 사진 미리보기" src={form.avatar_url} /> : <span>{form.nickname.slice(0, 1) || '?'}</span>}
              </div>
              <input accept="image/*" onChange={(event) => handleAvatarPick(event.target.files?.[0])} type="file" />
              {form.avatar_url && <button className="secondary-button" disabled={isUploading} onClick={resetAvatar} type="button">기본 이미지</button>}
            </div>
            {isUploading && <span className="upload-hint">사진 처리 중...</span>}
          </label>
          <label>닉네임<input value={form.nickname} maxLength={12} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label>
          <label>나이<input type="number" value={form.age} min={20} max={80} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} /></label>
          <label>지역<input value={form.location} maxLength={20} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
          <label>성별<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as MyProfile['gender'] })}><option value="female">여성</option><option value="male">남성</option><option value="none">선택 안 함</option></select></label>
          <label>소개<textarea value={form.bio} maxLength={80} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
          <Button type="submit">프로필 저장</Button>
        </form>
      </Card>

      {cropImageUrl && <AvatarCropModal imageUrl={cropImageUrl} onApply={uploadCroppedAvatar} onClose={() => setCropImageUrl('')} />}

      {['포인트 충전', '알림 설정', '차단/신고 관리'].map((item) => (
        <Card className="setting-item" key={item}><strong>{item}</strong><span>›</span></Card>
      ))}
    </section>
  );
}