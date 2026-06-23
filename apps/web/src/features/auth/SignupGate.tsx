import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '../../shared/components/Button';
import { isKoreaRegion, KOREA_REGIONS } from '../home/api/koreaRegions';
import { defaultProfile, saveMyProfile, type MyProfile } from '../home/api/profileStorage';
import { syncProfile } from '../home/api/profileSync';
import { completeSignup, hasCompletedSignup } from './authStorage';
import '../home/HomePage.css';
import '../home/HomeExtra.css';
import './SignupGate.css';

type SignupValues = Pick<MyProfile, 'nickname' | 'gender' | 'age' | 'location'>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '가입 정보를 저장하지 못했어요.';
}

export function SignupGate({ children }: { children: ReactNode }) {
  const [isSignedUp, setIsSignedUp] = useState(hasCompletedSignup());
  const [values, setValues] = useState<SignupValues>({ nickname: '', gender: 'none', age: 20, location: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nickname = values.nickname.trim();
    const age = Number(values.age);
    const location = values.location.trim();

    if (nickname.length < 2 || nickname.length > 12) {
      setError('닉네임은 2자 이상 12자 이하로 입력해주세요.');
      return;
    }

    if (!Number.isFinite(age) || age < 20 || age > 80) {
      setError('나이는 20세 이상 80세 이하로 입력해주세요.');
      return;
    }

    if (values.gender === 'none') {
      setError('성별을 선택해주세요.');
      return;
    }

    if (!isKoreaRegion(location)) {
      setError('지역을 선택해주세요.');
      return;
    }

    const profile: MyProfile = {
      ...defaultProfile,
      nickname,
      gender: values.gender,
      age,
      location,
      bio: '',
    };

    setIsSubmitting(true);
    setError('');

    try {
      await syncProfile('', profile);
      saveMyProfile(profile);
      completeSignup();
      setIsSignedUp(true);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSignedUp) return <>{children}</>;

  return (
    <main className="signup-shell">
      <section className="signup-card" aria-labelledby="signup-title">
        <p className="home-kicker">플러팅</p>
        <h1 id="signup-title">20세 이상 가입</h1>
        <p className="signup-copy">닉네임, 성별, 나이, 지역을 설정하면 바로 시작할 수 있어요. 같은 기기에서는 한 계정만 사용할 수 있어요.</p>

        <form className="profile-form" onSubmit={submit}>
          <label>
            닉네임
            <input autoComplete="nickname" disabled={isSubmitting} maxLength={12} onChange={(event) => setValues((current) => ({ ...current, nickname: event.target.value }))} placeholder="닉네임 입력" value={values.nickname} />
          </label>

          <label>
            성별
            <select disabled={isSubmitting} onChange={(event) => setValues((current) => ({ ...current, gender: event.target.value as SignupValues['gender'] }))} value={values.gender}>
              <option value="none">선택</option>
              <option value="female">여성</option>
              <option value="male">남성</option>
            </select>
          </label>

          <label>
            나이
            <input disabled={isSubmitting} max={80} min={20} onChange={(event) => setValues((current) => ({ ...current, age: Number(event.target.value) }))} type="number" value={values.age} />
          </label>

          <label>
            지역
            <select disabled={isSubmitting} onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))} value={values.location}>
              <option value="">지역 선택</option>
              {KOREA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </label>

          {error && <p className="error-text" role="alert">{error}</p>}
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? '가입 정보 저장 중...' : '가입하고 시작하기'}</Button>
        </form>
      </section>
    </main>
  );
}
