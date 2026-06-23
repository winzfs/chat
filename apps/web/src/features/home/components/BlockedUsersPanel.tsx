import { useEffect, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { listBlockedUsers, unblockUser, type BlockedUser } from '../api/userSafety';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function BlockedUsersPanel({ onClose }: { onClose: () => void }) {
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState('');

  const refreshBlocks = () => {
    setIsLoading(true);
    setNotice('');

    listBlockedUsers()
      .then(setBlocks)
      .catch((error) => setNotice(errorMessage(error, '차단 목록을 불러오지 못했어요.')))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refreshBlocks();
  }, []);

  const handleUnblock = async (blockedId: string) => {
    if (unblockingId) return;

    setUnblockingId(blockedId);
    setNotice('');
    try {
      const ok = await unblockUser(blockedId);
      if (!ok) {
        setNotice('차단을 해제하지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }

      setNotice('차단을 해제했어요.');
      setBlocks((current) => current.filter((block) => block.blocked_id !== blockedId));
    } finally {
      setUnblockingId('');
    }
  };

  return (
    <section className="talk-list" aria-label="차단 관리">
      <Card className="settings-summary">
        <button type="button" onClick={onClose}>← 설정</button>
        <strong>차단 관리</strong>
        <p>내가 차단한 사용자를 확인하고 해제할 수 있어요.</p>
      </Card>

      {notice && <Card className="settings-summary"><strong aria-live="polite">{notice}</strong></Card>}
      {isLoading && <Card className="person-card"><strong>차단 목록을 불러오는 중...</strong></Card>}
      {!isLoading && blocks.length === 0 && !notice && <Card className="person-card"><strong>차단한 사용자가 없어요.</strong><p>채팅방에서 상대방을 차단하면 이곳에 표시돼요.</p></Card>}

      {blocks.map((block) => (
        <Card className="person-card" key={block.blocked_id}>
          <div className="talk-card-header">
            <div>
              <strong>{block.blocked_nickname || '상대방'}</strong>
              <p>{block.created_at ? `${new Date(block.created_at).toLocaleString()} 차단` : '차단됨'}</p>
            </div>
          </div>
          <div className="talk-actions">
            <span>차단을 해제하면 사람 목록과 채팅 생성 제한이 풀려요.</span>
            <button disabled={Boolean(unblockingId)} type="button" onClick={() => handleUnblock(block.blocked_id)}>{unblockingId === block.blocked_id ? '해제 중...' : '해제'}</button>
          </div>
        </Card>
      ))}
    </section>
  );
}
