export type MyProfile = {
  nickname: string;
  gender: 'female' | 'male' | 'none';
  age: number;
  location: string;
  bio: string;
};

const profileKey = 'chitchat.myProfile.v1';

export const defaultProfile: MyProfile = {
  nickname: '민지',
  gender: 'female',
  age: 25,
  location: '서울',
  bio: '가볍게 대화하면서 친해지고 싶어요.',
};

export function loadMyProfile(): MyProfile {
  try {
    const saved = localStorage.getItem(profileKey);
    return saved ? { ...defaultProfile, ...JSON.parse(saved) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveMyProfile(profile: MyProfile) {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}
