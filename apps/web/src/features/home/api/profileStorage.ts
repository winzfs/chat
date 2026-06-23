import { isKoreaRegion } from './koreaRegions';

export type MyProfile = {
  nickname: string;
  gender: 'female' | 'male' | 'none';
  age: number;
  location: string;
  bio: string;
  avatar_url?: string;
};

const profileKey = 'chitchat.myProfile.v1';

export const defaultProfile: MyProfile = {
  nickname: '민지',
  gender: 'female',
  age: 25,
  location: '서울특별시',
  bio: '가볍게 대화하면서 친해지고 싶어요.',
  avatar_url: '',
};

function normalizeProfile(value: unknown): MyProfile {
  if (!value || typeof value !== 'object') return { ...defaultProfile };

  const profile = value as Partial<MyProfile>;
  const nickname = typeof profile.nickname === 'string' ? profile.nickname.trim().slice(0, 12) : '';
  const age = Number(profile.age);
  const gender = profile.gender === 'female' || profile.gender === 'male' || profile.gender === 'none'
    ? profile.gender
    : defaultProfile.gender;
  const location = typeof profile.location === 'string' && isKoreaRegion(profile.location)
    ? profile.location
    : defaultProfile.location;
  const bio = typeof profile.bio === 'string' ? profile.bio.slice(0, 80) : defaultProfile.bio;
  const avatarUrl = typeof profile.avatar_url === 'string' ? profile.avatar_url : '';

  return {
    nickname: nickname.length >= 2 ? nickname : defaultProfile.nickname,
    gender,
    age: Number.isFinite(age) && age >= 20 && age <= 80 ? age : defaultProfile.age,
    location,
    bio,
    avatar_url: avatarUrl,
  };
}

export function loadMyProfile(): MyProfile {
  try {
    const saved = localStorage.getItem(profileKey);
    return saved ? normalizeProfile(JSON.parse(saved)) : { ...defaultProfile };
  } catch {
    return { ...defaultProfile };
  }
}

export function saveMyProfile(profile: MyProfile) {
  localStorage.setItem(profileKey, JSON.stringify(normalizeProfile(profile)));
}
