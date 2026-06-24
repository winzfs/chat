import { useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { Modal } from '../../../shared/components/Modal';
import { deleteAccount } from '../api/accountDeletion';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '회원 탈퇴를 처리하지 못했어요.';
}

function resetLocalAccount() {
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith('chitchat.')));
  for (const key of keys) localStorage.removeItem(key);
  window.location.replace('/');
}

export function AccountDeletionCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const confirmDeletion = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    setNotice('');
    try {
      await deleteAccount();
      resetLocalAccount();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="person-card">
        <strong>회원 탈퇴</strong>
        <p>프로필, 토크, 채팅, 포인트, 마이룸과 저장된 이미지를 삭제합니다. 삭제 후에는 복구할 수 없어요.</p>
        {notice && <p className="error-text" role="alert">{notice}</p>}
        <button className="secondary-button" type="button" onClick={() => setIsOpen(true)}>회원 탈퇴</button>
      </Card>

      {isOpen && (
        <Modal labelledBy="account-delete-title" onClose={() => setIsOpen(false)} preventClose={isDeleting}>
          <div className="chat-leave-sheet">
            <strong id="account-delete-title">정말 탈퇴할까요?</strong>
            <p>모든 계정 데이터와 이미지가 삭제되며 복구할 수 없습니다.</p>
            <div className="chat-leave-actions">
              <button disabled={isDeleting} type="button" onClick={() => setIsOpen(false)}>취소</button>
              <button disabled={isDeleting} type="button" onClick={() => void confirmDeletion()}>{isDeleting ? '삭제 중...' : '탈퇴하고 삭제'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
