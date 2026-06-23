export type ProfileInput = {
  nickname?: unknown;
  age?: unknown;
  location?: unknown;
  bio?: unknown;
  avatar_url?: unknown;
};

export type ValidProfile = {
  nickname: string;
  age: number;
  location: string;
  bio: string;
  avatarUrl: string;
};

const KOREA_REGIONS = new Set([
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
]);

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateProfileInput(input: ProfileInput): { profile: ValidProfile } | { error: string } {
  const nickname = text(input.nickname);
  const age = Number(input.age);
  const location = text(input.location);
  const bio = text(input.bio);
  const avatarUrl = text(input.avatar_url);

  if (nickname.length < 2 || nickname.length > 12) return { error: '닉네임은 2자 이상 12자 이하로 입력해주세요.' };
  if (!Number.isInteger(age) || age < 20 || age > 80) return { error: '나이는 20세 이상 80세 이하로 입력해주세요.' };
  if (!KOREA_REGIONS.has(location)) return { error: '올바른 지역을 선택해주세요.' };
  if (bio.length > 80) return { error: '소개는 80자 이하로 입력해주세요.' };
  if (avatarUrl && !avatarUrl.startsWith('/api/profile-image?key=')) return { error: '올바르지 않은 프로필 이미지 주소예요.' };

  return { profile: { nickname, age, location, bio, avatarUrl } };
}
