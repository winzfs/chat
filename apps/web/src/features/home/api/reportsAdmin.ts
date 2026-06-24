import { apiUrl } from './apiBase';
import { parseApiResponse } from './apiResponse';
import { getAdminRequestHeaders } from './admin';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed' | 'closed';
export type SuspensionDays = 0 | 1 | 7 | 30 | -1;

export type AdminReport = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reported_nickname?: string | null;
  room_id?: string | null;
  reason: string;
  detail?: string | null;
  status: ReportStatus;
  admin_note?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  created_at: string;
};

export async function loadReports(status?: ReportStatus) {
  const params = new URLSearchParams({ limit: '50' });
  if (status) params.set('status', status);

  const response = await fetch(apiUrl(`/api/reports?${params.toString()}`), { headers: getAdminRequestHeaders() });
  const data = await parseApiResponse<{ reports?: AdminReport[] }>(response, '신고 목록을 불러오지 못했어요.');
  return data.reports ?? [];
}

export async function updateReportAction(input: {
  id: string;
  status: ReportStatus;
  adminNote: string;
  suspendDays: SuspensionDays;
}) {
  const response = await fetch(apiUrl('/api/reports'), {
    method: 'PATCH',
    headers: { ...getAdminRequestHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({
      id: input.id,
      status: input.status,
      admin_note: input.adminNote,
      suspend_days: input.suspendDays,
    }),
  });

  return parseApiResponse<{ ok?: boolean; suspended?: boolean }>(response, '신고를 처리하지 못했어요.');
}

export async function clearUserSuspension(profileId: string) {
  const response = await fetch(apiUrl('/api/reports'), {
    method: 'DELETE',
    headers: { ...getAdminRequestHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId }),
  });

  return parseApiResponse<{ ok?: boolean; unsuspended?: boolean; profile_id?: string }>(response, '사용자 정지를 해제하지 못했어요.');
}
