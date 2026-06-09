import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { loadUserReview } from '../api/admin';
import { loadReports, updateReportStatus, type AdminReport, type ReportStatus } from '../api/reportsAdmin';

const statusLabels: Record<ReportStatus, string> = {
  open: '접수',
  reviewing: '검토중',
  closed: '종료',
};

type ReviewData = Awaited<ReturnType<typeof loadUserReview>>;

export function ReportsAdminPanel({ onClose }: { onClose: () => void }) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('open');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reviewData, setReviewData] = useState<ReviewData>(null);

  const refreshReports = () => {
    setIsLoading(true);
    loadReports(statusFilter === 'all' ? undefined : statusFilter)
      .then(setReports)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refreshReports();
  }, [statusFilter]);

  const changeStatus = async (report: AdminReport, status: ReportStatus) => {
    const ok = await updateReportStatus(report.id, status);
    if (!ok) {
      setNotice('상태를 변경하지 못했어요.');
      return;
    }

    setNotice('신고 상태를 변경했어요.');
    refreshReports();
  };

  const openReview = async (report: AdminReport) => {
    setNotice('대상 정보를 불러오는 중...');
    const loaded = await loadUserReview(report.reported_id);
    setReviewData(loaded);
    setNotice(loaded ? '대상 정보를 불러왔어요.' : '대상 정보를 불러오지 못했어요.');
  };

  return (
    <section className="talk-list" aria-label="신고 관리">
      <Card className="settings-summary">
        <button type="button" onClick={onClose}>← 설정</button>
        <strong>신고 관리</strong>
        <p>최근 신고를 확인하고 처리 상태를 바꿀 수 있어요.</p>
      </Card>

      <Card className="person-card">
        <label>
          상태 필터
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReportStatus | 'all')}>
            <option value="open">접수</option>
            <option value="reviewing">검토중</option>
            <option value="closed">종료</option>
            <option value="all">전체</option>
          </select>
        </label>
      </Card>

      {notice && <Card className="settings-summary"><strong>{notice}</strong></Card>}
      {reviewData && <ReviewSummary data={reviewData} onClose={() => setReviewData(null)} />}
      {isLoading && <Card className="person-card"><strong>신고 목록을 불러오는 중...</strong></Card>}
      {!isLoading && reports.length === 0 && <Card className="person-card"><strong>표시할 신고가 없어요.</strong><p>새 신고가 접수되면 이곳에 표시돼요.</p></Card>}

      {reports.map((report) => (
        <Card className="person-card" key={report.id}>
          <div className="talk-card-header">
            <div>
              <strong>{report.reported_nickname || '상대방'} 신고</strong>
              <p>{statusLabels[report.status] ?? report.status} · {new Date(report.created_at).toLocaleString()}</p>
            </div>
          </div>
          <p>사유: {report.reason}</p>
          {report.detail && <p>상세: {report.detail}</p>}
          <p>신고자: {report.reporter_id.slice(0, 8)}... · 대상: {report.reported_id.slice(0, 8)}...</p>
          {report.room_id && <p>방 ID: {report.room_id.slice(0, 8)}...</p>}
          <div className="talk-actions">
            <span>처리 상태 변경</span>
            <Button onClick={() => openReview(report)} type="button">대상 보기</Button>
            <Button disabled={report.status === 'open'} onClick={() => changeStatus(report, 'open')} type="button">접수</Button>
            <Button disabled={report.status === 'reviewing'} onClick={() => changeStatus(report, 'reviewing')} type="button">검토중</Button>
            <Button disabled={report.status === 'closed'} onClick={() => changeStatus(report, 'closed')} type="button">종료</Button>
          </div>
        </Card>
      ))}
    </section>
  );
}

function ReviewSummary({ data, onClose }: { data: NonNullable<ReviewData>; onClose: () => void }) {
  const user = data.user ?? {};
  const nickname = String(user.nickname ?? '알 수 없음');
  const avatarUrl = String(user.avatar_url ?? '');
  const bio = String(user.bio ?? '소개 없음');

  return (
    <Card className="person-card">
      <div className="talk-card-header">
        <div className="avatar-wrap">{avatarUrl ? <img alt="프로필" className="avatar" src={avatarUrl} /> : <span className="avatar">{nickname.slice(0, 1)}</span>}</div>
        <div>
          <strong>{nickname}</strong>
          <p>{String(user.age ?? '-')}세 · {String(user.location ?? '지역 없음')}</p>
        </div>
      </div>
      <p>소개: {bio}</p>
      <p>토크 {data.talk_posts?.length ?? 0}개 · 채팅방 {data.rooms?.length ?? 0}개 · 방 메시지 {data.room_messages?.length ?? 0}개 · 작성 메시지 {data.sent_messages?.length ?? 0}개</p>
      <div className="talk-actions">
        <span>운영자 검토 자료</span>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    </Card>
  );
}
