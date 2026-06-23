import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { apiUrl, assetUrl } from '../api/apiBase';
import { parseApiResponse } from '../api/apiResponse';
import { loadAdminStatus } from '../api/admin';
import { isKoreaRegion, KOREA_REGIONS } from '../api/koreaRegions';
import { claimAdRewardPoints, claimAttendancePoints, loadPointStatus, type PointStatus } from '../api/points';
import type { MyProfile } from '../api/profileStorage';
import { AvatarCropModal } from './AvatarCropModal';
import { BlockedUsersPanel } from './BlockedUsersPanel';
import { MyRoomSettingsPanel } from './MyRoomSettingsPanel';
import { ReportsAdminPanel } from './ReportsAdminPanel';
import './SettingsLegalLinks.css';

async function uploadAvatar(image: File) {
  const formData = new FormData();
  formData.append('image', image);

  const response = await fetch(apiUrl('/api/profile-image'), { method: 'POST', body: formData });
  const data = await parseApiResponse<{ avatar_url?: string }>(response, '프로필 사진을 업로드하지 못했어요.');
  if (!data.avatar_url) throw new Error('업로드된 프로필 사진을 확인하지 못했어요.');
  return data.avatar_url;
}

async function deleteAvatar(avatarUrl: string) {
  const params = new URLSearchParams({ avatar_url: avatarUrl });
  const response = await fetch(apiUrl(`/api/profile-image?${params.toString()}`), { method: 'DELETE' });
  await parseApiResponse<{ avatar_url: string }>(response, '임시 프로필 사진을 정리하지 못했어요.');
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const pointProducts = [
  { label: '1,000P', price: '₩1,200', hint: '기본 충전' },
  { label: '5,300P', price: '₩6,000', hint: '300P 보너스' },
  { label: '10,800P', price: '₩12,000', hint: '800P 보너스' },
  { label: '33,000P', price: '₩36,000', hint: '3,000P 보너스' },
  { label: '57,000P', price: '₩60,000', hint: '7,000P 보너스' },
];

function formatPointDate(value: string) {
  const date = new Date(value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ProfileSettingsPanel({ myProfile, onSave }: { myProfile: MyProfile; onSave: (profile: MyProfile) => Promise<void> | void }) {
  const [form, setForm] = useState<MyProfile>(myProfile);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [cropImageUrl, setCropImageUrl] = useState('');
  const [isReportAdminOpen, setIsReportAdminOpen] = useState(false);
  const [isBlockListOpen, setIsBlockListOpen] = useState(false);
  const [isMyRoomOpen, setIsMyRoomOpen] = useState(false);
  const [isChargeOpen, setIsChargeOpen] = useState(false);
  const [isPointHistoryOpen, setIsPointHistoryOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pointStatus, setPointStatus] = useState<PointStatus | null>(null);
  const [pointNotice, setPointNotice] = useState('');
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const refreshPoints = () => {
    loadPointStatus().then(setPointStatus).catch((error) => {
      setPointStatus(null);
      setPointNotice(errorMessage(error, '포인트 정보를 불러오지 못했어요.'));
    });
  };

  useEffect(() => {
    setForm(myProfile);
  }, [myProfile]);

  useEffect(() => {
    loadAdminStatus().then(setIsAdmin).catch(() => setIsAdmin(false));
    refreshPoints();
  }, []);

  useEffect(() => () => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
  }, [cropImageUrl]);

  const persistProfile = async (next: MyProfile) => {
    setIsSavingProfile(true);
    setProfileNotice('');

    try {
      await onSave(next);
      setProfileNotice('프로필이 저장됐어요.');
      return true;
    } catch (error) {
      setProfileNotice(errorMessage(error, '프로필을 저장하지 못했어요.'));
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await persistProfile(form);
  };

  const handleAvatarPick = (file?: File) => {
    if (!file) return;
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(URL.createObjectURL(file));
  };

  const uploadCroppedAvatar = async (file: File) => {
    setIsUploading(true);
    setProfileNotice('');
    let uploadedAvatarUrl = '';

    try {
      uploadedAvatarUrl = await uploadAvatar(file);
      const next = { ...form, avatar_url: uploadedAvatarUrl };
      const saved = await persistProfile(next);

      if (saved) {
        setForm(next);
      } else {
        await deleteAvatar(uploadedAvatarUrl).catch(() => undefined);
      }
    } catch (error) {
      if (uploadedAvatarUrl) {
        await deleteAvatar(uploadedAvatarUrl).catch(() => undefined);
      }
      setProfileNotice(errorMessage(error, '프로필 사진을 저장하지 못했어요.'));
    } finally {
      setIsUploading(false);
      setCropImageUrl('');
    }
  };

  const resetAvatar = async () => {
    setIsUploading(true);
    setProfileNotice('');

    try {
      const next = { ...form, avatar_url: '' };
      const saved = await persistProfile(next);
      if (saved) setForm(next);
    } finally {
      setIsUploading(false);
    }
  };

  const checkAttendance = async () => {
    setIsCheckingAttendance(true);
    const result = await claimAttendancePoints();
    setIsCheckingAttendance(false);

    if (!result) {
      setPointNotice('출석체크를 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    setPointNotice(result.message);
    refreshPoints();
  };

  const watchAd = async () => {
    setIsWatchingAd(true);
    const result = await claimAdRewardPoints();
    setIsWatchingAd(false);

    if (!result) {
      setPointNotice('광고 보상을 처리하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    setPointNotice(result.message);
    refreshPoints();
  };

  const showChargeNotice = (productLabel: string) => {
    setPointNotice(`${productLabel} 충전 결제는 아직 준비 중이에요.`);
  };

  const regionValue = isKoreaRegion(form.location) ? form.location : '';
  const profileLocation = isKoreaRegion(myProfile.location) ? myProfile.location : '지역 재선택 필요';
  const pointHistory = pointStatus?.history ?? [];

  if (isReportAdminOpen) {
    return <ReportsAdminPanel onClose={() => setIsReportAdminOpen(false)} />;
  }

  if (isBlockListOpen) {
    return <BlockedUsersPanel onClose={() => setIsBlockListOpen(false)} />;
  }

  if (isMyRoomOpen) {
    return <MyRoomSettingsPanel onClose={() => setIsMyRoomOpen(false)} />;
  }

  return (
    <section className="talk-list" aria-label="프로필 설정">
      <Card className="settings-summary profile-summary-card">
        <div className="profile-avatar-preview">
          {myProfile.avatar_url ? <img alt="프로필 사진" src={assetUrl(myProfile.avatar_url)} /> : <span>{myProfile.nickname.slice(0, 1)}</span>}
        </div>
        <strong>{myProfile.nickname}님</strong>
        <p>{myProfile.age}세 · {profileLocation}</p>
        <p>{myProfile.gender === 'female' ? '여성' : myProfile.gender === 'male' ? '남성' : '성별 선택 안 함'}</p>
        <p>{myProfile.bio}</p>
      </Card>

      <Card className="person-card">
        <strong>포인트</strong>
        <p>{pointStatus ? `${pointStatus.balance.toLocaleString()}P 보유 중` : '포인트 정보를 불러오지 못했어요.'}</p>
        <p>쪽지를 보낼 때 100P가 사용돼요.</p>
        {pointNotice && <p>{pointNotice}</p>}
        <div className="chat-room-card-actions">
          <button type="button" disabled={isCheckingAttendance || Boolean(pointStatus?.attendance_claimed)} onClick={checkAttendance}>{pointStatus?.attendance_claimed ? '출석완료' : isCheckingAttendance ? '처리 중' : '출석체크 100P'}</button>
          <button type="button" disabled={isWatchingAd || Boolean(pointStatus?.ad_reward_claimed)} onClick={watchAd}>{pointStatus?.ad_reward_claimed ? '광고보상 완료' : isWatchingAd ? '처리 중' : '광고보기 100P'}</button>
          <button type="button" onClick={() => setIsChargeOpen((value) => !value)}>포인트 충전</button>
          <button type="button" onClick={() => setIsPointHistoryOpen((value) => !value)}>포인트 내역</button>
        </div>
      </Card>

      {isPointHistoryOpen && (
        <Card className="person-card">
          <strong>포인트 내역</strong>
          {pointHistory.length === 0 && <p>아직 포인트 내역이 없어요.</p>}
          {pointHistory.map((item) => (
            <div className="setting-item" key={item.id}>
              <strong>{item.amount > 0 ? `+${item.amount.toLocaleString()}P` : `${item.amount.toLocaleString()}P`}</strong>
              <span>{item.description || item.reason} · {formatPointDate(item.created_at)}</span>
            </div>
          ))}
        </Card>
      )}

      {isChargeOpen && (
        <Card className="person-card">
          <strong>포인트 충전</strong>
          <p>기본 1,000P는 1,200원이고, 많이 충전할수록 보너스 포인트가 붙어요.</p>
          {pointProducts.map((product) => (
            <button className="setting-item" key={product.label} type="button" onClick={() => showChargeNotice(product.label)}>
              <strong>{product.label}</strong>
              <span>{product.price} · {product.hint}</span>
            </button>
          ))}
        </Card>
      )}

      <Card className="person-card">
        <form className="profile-form" onSubmit={handleSubmit}>
          <label>
            프로필 사진
            <div className="profile-photo-input-row">
              <div className="profile-avatar-preview is-small">
                {form.avatar_url ? <img alt="프로필 사진 미리보기" src={assetUrl(form.avatar_url)} /> : <span>{form.nickname.slice(0, 1) || '?'}</span>}
              </div>
              <input accept="image/*" onChange={(event) => handleAvatarPick(event.target.files?.[0])} type="file" />
              {form.avatar_url && <button className="secondary-button" disabled={isUploading} onClick={resetAvatar} type="button">기본 이미지</button>}
            </div>
            {isUploading && <span className="upload-hint">사진 처리 중...</span>}
          </label>
          <label>닉네임<input value={form.nickname} maxLength={12} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label>
          <label>나이<input type="number" value={form.age} min={20} max={80} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })} /></label>
          <label>지역<select value={regionValue} onChange={(event) => setForm({ ...form, location: event.target.value })}><option value="">지역 선택</option>{KOREA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
          <label>성별<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as MyProfile['gender'] })}><option value="female">여성</option><option value="male">남성</option><option value="none">선택 안 함</option></select></label>
          <label>소개<textarea value={form.bio} maxLength={80} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
          {profileNotice && <p className="error-text">{profileNotice}</p>}
          <Button disabled={isSavingProfile || isUploading} type="submit">{isSavingProfile ? '저장 중...' : '프로필 저장'}</Button>
        </form>
      </Card>

      {cropImageUrl && <AvatarCropModal imageUrl={cropImageUrl} onApply={uploadCroppedAvatar} onClose={() => setCropImageUrl('')} />}

      <Card className="setting-item"><strong>마이룸 꾸미기</strong><button className="secondary-button" onClick={() => setIsMyRoomOpen(true)} type="button">열기</button></Card>
      <Card className="setting-item"><strong>알림 설정</strong><span>›</span></Card>
      <Card className="setting-item"><strong>차단 관리</strong><button className="secondary-button" onClick={() => setIsBlockListOpen(true)} type="button">열기</button></Card>
      <Card className="person-card"><strong>안전 기능</strong><p>불쾌한 상대는 채팅방에서 바로 신고하거나 차단할 수 있어요. 차단한 사용자는 사람 목록과 새 쪽지에서 제외돼요.</p></Card>
      {isAdmin && <Card className="setting-item"><strong>신고 관리</strong><button className="secondary-button" onClick={() => setIsReportAdminOpen(true)} type="button">열기</button></Card>}

      <Card className="person-card settings-legal-card">
        <strong>서비스 안내</strong>
        <p>플러팅은 20세 이상 이용자를 위한 1:1 대화 서비스입니다.</p>
        <div className="legal-link-row">
          <a href="/terms.html">이용약관</a>
          <a href="/privacy.html">개인정보처리방침</a>
        </div>
      </Card>
    </section>
  );
}
