import { lazy, Suspense } from 'react';
import { Card } from '../../../shared/components/Card';

const LazyBlockedUsersPanel = lazy(() => import('./BlockedUsersPanel').then((module) => ({ default: module.BlockedUsersPanel })));
const LazyMyRoomSettingsPanel = lazy(() => import('./MyRoomSettingsPanel').then((module) => ({ default: module.MyRoomSettingsPanel })));
const LazyReportsAdminPanel = lazy(() => import('./ReportsAdminPanel').then((module) => ({ default: module.ReportsAdminPanel })));

export type SettingsSubpanel = 'blocked-users' | 'my-room' | 'reports';

export function SettingsLazyPanel({ panel, onClose }: { panel: SettingsSubpanel; onClose: () => void }) {
  return (
    <Suspense fallback={<SettingsPanelFallback onClose={onClose} />}>
      {panel === 'blocked-users' && <LazyBlockedUsersPanel onClose={onClose} />}
      {panel === 'my-room' && <LazyMyRoomSettingsPanel onClose={onClose} />}
      {panel === 'reports' && <LazyReportsAdminPanel onClose={onClose} />}
    </Suspense>
  );
}

function SettingsPanelFallback({ onClose }: { onClose: () => void }) {
  return (
    <section className="talk-list" aria-label="설정 화면 불러오기">
      <Card className="settings-summary">
        <button type="button" onClick={onClose}>← 설정</button>
        <strong>화면을 불러오는 중...</strong>
        <p>잠시만 기다려주세요.</p>
      </Card>
    </section>
  );
}
