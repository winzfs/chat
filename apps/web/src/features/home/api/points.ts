import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';

export type PointStatus = {
  balance: number;
  today: string;
  attendance_claimed: boolean;
  talk_reward_claimed: boolean;
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

export async function loadPointStatus(): Promise<PointStatus> {
  const params = new URLSearchParams({ profile_id: getProfileId() });
  const response = await fetch(apiUrl(`/api/points?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return { balance: 0, today: '', attendance_claimed: false, talk_reward_claimed: false };
  }

  return response.json() as Promise<PointStatus>;
}

export async function claimAttendancePoints(): Promise<PointClaimResult | null> {
  const response = await fetch(apiUrl('/api/points'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: getProfileId(), action: 'attendance' }),
  });

  if (!response.ok) return null;
  return response.json() as Promise<PointClaimResult>;
}
