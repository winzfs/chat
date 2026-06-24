import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { deleteModeratedContent, loadUserReview, type ModeratedContentType } from '../api/admin';
import {
  loadReports,
  updateReportAction,
  type AdminReport,
  type ReportStatus,
  type SuspensionDays,
} from '../api/reportsAdmin';

const statusLabels: Record<ReportStatus, string> = {
  open: '접수',
  reviewing: '검토중',
  resolved: '처리완료',
  dismissed: '기각',
  closed: '종료(이전)',
};

const statusOptions: Array<{ value: ReportStatus; label: string }> = [
  { value: 'open', label: '접수' },
  { value: 'reviewing', label: '검토중' },
  { value: 'resolved', label: '처리완료' },
  { value: 'dismissed', label: '기각' },
];

const suspensionOptions: Array<{ value: SuspensionDays; label: string }> = [
  { value: 0, label: '정지하지 않음' },
  { value: 1, label: '1일 정지' },
  { value: 7, label: '7일 정지' },
  { value: 30, label: '30일 정지' },
  { value: -1, label: '무기한 정지' },
];

type ReviewData = Awaited<ReturnType<typeof loadUserReview>>;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ReportsAdminPanel({ onClose }: { onClose: () => void }) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('open');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reviewData, setReviewData] = useState<ReviewData>(null);
  const [reviewTargetId, setReviewTargetId] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [deletingContentId, setDeletingContentId] = useState('');

  const refreshReports = async () => {
    setIsLoading(true);
    setNotice('');
    try {
      setReports(await loadReports(statusFilter === 'all' ? undefined : statusFilter));
    } catch (error) {
      setReports([]);
      setNotice(errorMessage(error, '신고 목록을 불러오지 못했어요.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshReports();
  }, [statusFilter]);

  const processReport = async (report: AdminReport, input: { status: ReportStatus; adminNote: string; suspendDays: SuspensionDays }) => {
    if (processingId) return;

    setProcessingId(report.id);
    setNotice('');
    try {
      const result = await updateReportAction({ id: report.id, ...input });
      setNotice(result.suspended ? '신고 처리와 사용자 정지를 완료했어요.' : '신고 처리를 저장했어요.');
      await refreshReports();
    } catch (error) {
      setNotice(errorMessage(error, '신고를 처리하지 못했어요.'));
    } finally {
      setProcessingId('');
    }
  };

  const openReview = async (report: AdminReport) => {
    setReviewTargetId(report.reported_id);
    setNotice('대상 정보를 불러오는 중...');
    try {
      const loaded = await loadUserReview(report.reported_id);
      setReviewData(loaded);
      setNotice(loaded ? '대상 정보를 불러왔어요.' : '대상 정보를 불러오지 못했어요.');
    } catch (error) {
      setNotice(errorMessage(error, '대상 정보를 불러오지 못했어요.'));
    }
  };

  const deleteContent = async (contentType: ModeratedContentType, id: string) => {
    if (deletingContentId) return;

    setDeletingContentId(id);
    setNotice('콘텐츠를 삭제하는 중...');
    try {
      await deleteModeratedContent(contentType, id);
      setNotice(contentType === 'talk_post' ? '토크를 삭제했어요.' : '채팅 메시지를 삭제 처리했어요.');
      if (reviewTargetId) setReviewData(await loadUserReview(reviewTargetId));
    } catch (error) {
      setNotice(errorMessage(error, '콘텐츠를 삭제하지 못했어요.'));
    } finally {
      setDeletingContentId('');
    }
  };

  return (
    <section className="talk-list" aria-label="신고 관리">
      <Card className="settings-summary">
        <button type="button" onClick={onClose}>← 설정</button>
        <strong>신고 관리</strong>
        <p>신고 상태, 운영자 메모와 사용자 이용 정지를 처리할 수 있어요.</p>
      </Card>

      <Card className="person-card">
        <label>
          상태 필터
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReportStatus | 'all')}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            <option value="closed">종료(이전)</option>
            <option value="all">전체</option>
          </select>
        </label>
      </Card>

      {notice && <Card className="settings-summary"><strong aria-live="polite">{notice}</strong></Card>}
      {reviewData && (
        <ReviewSummary
          data={reviewData}
          deletingContentId={deletingContentId}
          onClose={() => {
            setReviewData(null);
            setReviewTargetId('');
          }}
          onDeleteContent={(contentType, id) => void deleteContent(contentType, id)}
        />
      )}
      {isLoading && <Card className="person-card"><strong>신고 목록을 불러오는 중...</strong></Card>}
      {!isLoading && reports.length === 0 && !notice && <Card className="person-card"><strong>표시할 신고가 없어요.</strong><p>새 신고가 접수되면 이곳에 표시돼요.</p></Card>}

      {reports.map((report) => (
        <ReportModerationCard
          isProcessing={processingId === report.id}
          key={report.id}
          onOpenReview={() => void openReview(report)}
          onProcess={(input) => void processReport(report, input)}
          report={report}
        />
      ))}
    </section>
  );
}

function ReportModerationCard({ isProcessing, onOpenReview, onProcess, report }: {
  isProcessing: boolean;
  onOpenReview: () => void;
  onProcess: (input: { status: ReportStatus; adminNote: string; suspendDays: SuspensionDays }) => void;
  report: AdminReport;
}) {
  const [status, setStatus] = useState<ReportStatus>(report.status === 'closed' ? 'resolved' : report.status);
  const [adminNote, setAdminNote] = useState(report.admin_note ?? '');
  const [suspendDays, setSuspendDays] = useState<SuspensionDays>(0);

  return (
    <Card className="person-card">
      <div className="talk-card-header">
        <div>
          <strong>{report.reported_nickname || '상대방'} 신고</strong>
          <p>{statusLabels[report.status]} · {new Date(report.created_at).toLocaleString()}</p>
        </div>
      </div>
      <p>사유: {report.reason}</p>
      {report.detail && <p>상세: {report.detail}</p>}
      <p>신고자: {report.reporter_id.slice(0, 8)}... · 대상: {report.reported_id.slice(0, 8)}...</p>
      {report.room_id && <p>방 ID: {report.room_id.slice(0, 8)}...</p>}
      {report.handled_at && <p>최근 처리: {new Date(report.handled_at).toLocaleString()}</p>}

      <div className="profile-form">
        <label>처리 상태<select disabled={isProcessing} value={status} onChange={(event) => setStatus(event.target.value as ReportStatus)}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>운영자 메모<textarea disabled={isProcessing} maxLength={1000} placeholder="판단 근거와 조치 내용을 기록하세요." value={adminNote} onChange={(event) => setAdminNote(event.target.value)} /></label>
        <label>사용자 정지<select disabled={isProcessing} value={suspendDays} onChange={(event) => setSuspendDays(Number(event.target.value) as SuspensionDays)}>{suspensionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>

      <div className="talk-actions">
        <Button disabled={isProcessing} onClick={onOpenReview} type="button">대상 보기</Button>
        <Button disabled={isProcessing} onClick={() => onProcess({ status, adminNote, suspendDays })} type="button">{isProcessing ? '저장 중...' : '처리 저장'}</Button>
      </div>
    </Card>
  );
}

function ReviewSummary({ data, deletingContentId, onClose, onDeleteContent }: {
  data: NonNullable<ReviewData>;
  deletingContentId: string;
  onClose: () => void;
  onDeleteContent: (contentType: ModeratedContentType, id: string) => void;
}) {
  const user = data.user ?? {};
  const nickname = String(user.nickname ?? '알 수 없음');
  const avatarUrl = String(user.avatar_url ?? '');
  const talks = data.talk_posts ?? [];
  const rooms = data.rooms ?? [];
  const sentMessages = data.sent_messages ?? [];

  return (
    <Card className="person-card">
      <div className="talk-card-header">
        <div className="avatar-wrap">{avatarUrl ? <img alt="프로필" className="avatar" src={avatarUrl} /> : <span className="avatar">{nickname.slice(0, 1)}</span>}</div>
        <div><strong>{nickname}</strong><p>{String(user.age ?? '-')}세 · {String(user.location ?? '지역 없음')}</p></div>
      </div>
      <p>소개: {String(user.bio ?? '소개 없음')}</p>
      <p>토크 {talks.length}개 · 채팅방 {rooms.length}개 · 작성 메시지 {sentMessages.length}개</p>
      <ReviewList
        deletingContentId={deletingContentId}
        items={talks}
        onDelete={(id) => onDeleteContent('talk_post', id)}
        textKey="text"
        title="최근 토크"
      />
      <ReviewList
        deletingContentId={deletingContentId}
        items={sentMessages}
        onDelete={(id) => onDeleteContent('chat_message', id)}
        textKey="body"
        title="최근 작성 메시지"
      />
      <ReviewList title="관련 채팅방" items={rooms} textKey="last_message" />
      <button type="button" onClick={onClose}>닫기</button>
    </Card>
  );
}

function ReviewList({ deletingContentId = '', items, onDelete, textKey, title }: {
  deletingContentId?: string;
  items: Array<Record<string, unknown>>;
  onDelete?: (id: string) => void;
  textKey: string;
  title: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="talk-list">
      <strong>{title}</strong>
      {items.slice(0, 5).map((item, index) => {
        const id = String(item.id ?? '');
        const createdAt = item.created_at ? String(item.created_at) : '';
        return (
          <Card className="settings-summary" key={`${title}-${id || index}`}>
            <p>{String(item[textKey] ?? '내용 없음')}</p>
            {createdAt ? <p>{new Date(createdAt).toLocaleString()}</p> : null}
            {onDelete && id ? (
              <button disabled={deletingContentId === id} onClick={() => onDelete(id)} type="button">
                {deletingContentId === id ? '삭제 중...' : '콘텐츠 삭제'}
              </button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
