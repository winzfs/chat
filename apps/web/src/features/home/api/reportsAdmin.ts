import { apiUrl } from './apiBase';
import { getAdminRequestHeaders } from './admin';

export type ReportStatus = 'open' | 'reviewing' | 'closed';

export type AdminReport = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reported_nickname?: string | null;
  room_id?: string | null;
  reason: string;
  detail?: string | null;
  status: ReportStatus;
  created_at: string;
};

export async function loadReports(status?: ReportStatus) {
  const params = new URLSearchParams({ limit: '50' });
  if (status) params.set('status', status);

  const response = await fetch(apiUrl(`/api/reports?${params.toString()}`), { headers: getAdminRequestHeaders() });
  if (!response.ok) return [];

  const data = await response.json() as { reports?: AdminReport[] };
  return data.reports ?? [];
}

export async function updateReportStatus(id: string, status: ReportStatus) {
  const response = await fetch(apiUrl('/api/reports'), {
    method: 'PATCH',
    headers: { ...getAdminRequestHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });

  return response.ok;
}
