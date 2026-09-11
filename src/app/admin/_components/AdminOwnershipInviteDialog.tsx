'use client';

import { useRef } from 'react';
import { useDialogLayer } from '@/hooks/useDialogLayer';

import type { AdminOwnershipInviteResult } from '@/services/eventOwnershipInviteService';

import { useAdminOverlay } from './AdminOverlayProvider';
import styles from '../page.module.css';

interface AdminOwnershipInviteDialogProps {
  invite: AdminOwnershipInviteResult | null;
  isReissuing: boolean;
  onClose: () => void;
  onReissue: () => Promise<void>;
}

export default function AdminOwnershipInviteDialog({
  invite,
  isReissuing,
  onClose,
  onReissue,
}: AdminOwnershipInviteDialogProps) {
  const { showToast } = useAdminOverlay();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  const closeDialog = () => { if (!isReissuing) onClose(); };
  useDialogLayer(dialogRef, { open: Boolean(invite), onClose: closeDialog, blocked: isReissuing });

  if (!invite) {
    return null;
  }

  const expiresAtLabel = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(invite.expiresAt);

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(invite.url);
      showToast({ title: '고객 연결 링크를 복사했습니다.', tone: 'success' });
    } catch {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
      showToast({
        title: '자동 복사에 실패했습니다.',
        message: '선택된 링크를 직접 복사해 주세요.',
        tone: 'error',
      });
    }
  };

  return (
    <div className={styles.ownershipInviteBackdrop} role="presentation" onClick={closeDialog}>
      <div
        ref={dialogRef}
        className={styles.ownershipInviteDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ownership-invite-dialog-title"
        onClick={(event) => event.stopPropagation()}
        aria-busy={isReissuing}
      >
        <h2 id="ownership-invite-dialog-title" className={styles.ownershipInviteTitle}>
          고객 연결 링크
        </h2>
        <p className={styles.ownershipInviteDescription}>
          이 링크를 고객에게 전달하면 로그인 또는 회원가입 후 청첩장이 자동으로 연결됩니다.
        </p>

        <label className="admin-field">
          <span className="admin-field-label">{invite.slug} 연결 링크</span>
          <input
            ref={linkInputRef}
            data-dialog-initial-focus
            className="admin-input"
            type="text"
            value={invite.url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>

        <div className={styles.ownershipInviteMeta}>
          <span>만료: {expiresAtLabel}</span>
          <strong>재발급하면 최신 링크만 사용할 수 있습니다.</strong>
        </div>

        <div className={styles.ownershipInviteActions}>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={closeDialog}
            disabled={isReissuing}
          >
            <img src="/images/admin/close.webp" alt="닫기" width="18" height="18" />
          </button>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            disabled={isReissuing}
            onClick={() => void onReissue()}
          >
            {isReissuing ? '재발급 중' : '링크 재발급'}
          </button>
          <button
            type="button"
            className="admin-button admin-button-primary"
            disabled={isReissuing}
            onClick={() => void copyInviteUrl()}
          >
            링크 복사
          </button>
        </div>
      </div>
    </div>
  );
}
