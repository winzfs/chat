import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { getProfileId } from '../api/profileId';
import type { MyProfile } from '../api/profileStorage';

async function uploadAvatar(image: File) {
  const formData = new FormData();
  formData.append('profile_id', getProfileId());
  formData.append('image', image);

  const response = await fetch('/api/profile-image', { method: 'POST', body: formData });
  if (!response.ok) return null;

  const data = await response.json() as { avatar_url?: string };
  return data.avatar_url ?? null;
}

export function ProfileSettingsPanel({ myProfile, onSave }: { myProfile: MyProfile; onSave: (profile: MyProfile) => void }) {
  const [form, setForm] = useState<MyProfile>(myProfile);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setForm(myProfile);
  }, [myProfile]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(form);
  };

  const handleAvatarChange = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    const avatarUrl = await uploadAvatar(file);
    setIsUploading(false);
    if (avatarUrl) {
      setForm((current) => ({ ...current, avatar_url: avatarUrl }));
    }
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
              <input accept="image/*" onChange={(event) => handleAvatarChange(event.target.files?.[0])} type="file" />
            </div>
            {isUploading && <span className="upload-hint">사진 업로드 중...</span>}
          </label>
          <label>닉네임<input value={form.nickname} maxLength={12} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label>
          <label>나이<input type="number" value={form.age} min={20} max={80} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} /></label>
          <label>지역<input value={form.location} maxLength={20} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
          <label>성별<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as MyProfile['gender'] })}><option value="female">여성</option><option value="male">남성</option><option value="none">선택 안 함</option></select></label>
          <label>소개<textarea value={form.bio} maxLength={80} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
          <Button type="submit">프로필 저장</Button>
        </form>
      </Card>

      {['포인트 충전', '알림 설정', '차단/신고 관리'].map((item) => (
        <Card className="setting-item" key={item}><strong>{item}</strong><span>›</span></Card>
      ))}
    </section>
  );
}
