export type TalkPost = {
  id: number;
  nickname: string;
  age: number;
  location: string;
  mood: string;
  text: string;
  tags: string[];
  likes: number;
  replies: number;
  online: boolean;
};

export const talkPosts: TalkPost[] = [
  {
    id: 1,
    nickname: '지우',
    age: 24,
    location: '서울',
    mood: '오늘의 수다',
    text: '퇴근하고 달달한 커피 마시러 갈 사람 있어요? ☕',
    tags: ['카페', '산책', '가벼운대화'],
    likes: 18,
    replies: 5,
    online: true,
  },
  {
    id: 2,
    nickname: '민준',
    age: 26,
    location: '인천',
    mood: '취미 공유',
    text: '주말에 영화 볼 예정인데 잔잔한 영화 추천받아요.',
    tags: ['영화', '주말', '추천'],
    likes: 9,
    replies: 3,
    online: true,
  },
  {
    id: 3,
    nickname: '서연',
    age: 23,
    location: '대구',
    mood: '고민 상담',
    text: '새로운 사람 만나는 게 어색한데 자연스럽게 대화하는 팁 있을까요?',
    tags: ['고민', '대화', '공감'],
    likes: 31,
    replies: 12,
    online: false,
  },
];

export const recommendedUsers = [
  { id: 1, nickname: '하린', age: 25, location: '서울', matchRate: 92, online: true },
  { id: 2, nickname: '도윤', age: 27, location: '경기', matchRate: 88, online: true },
  { id: 3, nickname: '나은', age: 24, location: '부산', matchRate: 84, online: false },
];
