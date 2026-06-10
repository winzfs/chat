import { apiUrl } from './apiBase';
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
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/points?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return emptyStatus;
  }

  const data = await response.json() as Partial<PointStatus>;
  return { ...emptyStatus, ...data, history: data.history ?? [] };
}

async function claimPoints(action: 'attendance' | 'ad_reward'): Promise<PointClaimResult | null> {
  const response = await fetch(apiUrl('/api/points'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: getProfileId(), action }),
  });

  if (!response.ok) return null;
  return response.json() as Promise<PointClaimResult>;
}

export function claimAttendancePoints() {
  return claimPoints('attendance');
}

export function claimAdRewardPoints() {
  return claimPoints('ad_reward');
}
