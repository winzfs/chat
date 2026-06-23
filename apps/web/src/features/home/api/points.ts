import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import { getProfileId } from './profileId';

export type PointHistoryItem = {
  id: string;
  amount: number;
  reason: string;
  reference_id?: string | null;
  description?: string | null;
  created_at: string;
};

export type PointStatus = {
  balance: number;
  today: string;
  attendance_claimed: boolean;
  talk_reward_claimed: boolean;
  ad_reward_claimed: boolean;
  history: PointHistoryItem[];
};

export type PointClaimResult = {
  awarded: boolean;
  amount: number;
  balance: number;
  today: string;
  message: string;
};

export class PointError extends Error {
  balance?: number;

  constructor(message: string, balance?: number) {
    super(message);
    this.balance = balance;
  }
}

const emptyStatus: PointStatus = {
  balance: 0,
  today: '',
  attendance_claimed: false,
  talk_reward_claimed: false,
  ad_reward_claimed: false,
  history: [],
};

export async function loadPointStatus(): Promise<PointStatus> {
  const response = await fetch(apiUrl('/api/points'), { cache: 'no-store' });
  const data = await parseApiResponse<Partial<PointStatus>>(response, '포인트 정보를 불러오지 못했어요.');
  return { ...emptyStatus, ...data, history: data.history ?? [] };
}

async function claimPoints(action: 'attendance' | 'ad_reward'): Promise<PointClaimResult> {
  const response = await fetch(apiUrl('/api/points'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: getProfileId(), action }),
  });

  return parseApiResponse<PointClaimResult>(response, '포인트 보상을 처리하지 못했어요.');
}

export function claimAttendancePoints() {
  return claimPoints('attendance');
}

export function claimAdRewardPoints() {
  return claimPoints('ad_reward');
}
