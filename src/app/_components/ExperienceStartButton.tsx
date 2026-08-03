'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  handleExperienceNoticeKeyDown,
  shouldDismissExperienceNotice,
} from './homeInteractionPolicy';

import styles from './ExperienceStartButton.module.css';

export default function ExperienceStartButton() {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const closeNotice = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open || !noticeRef.current) {
      return;
    }

    const notice = noticeRef.current;
    if (!notice.open) {
      notice.showModal();
    }
    notice.focus();
  }, [open]);

  const start = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/experience/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || '체험을 시작하지 못했습니다.');
      }
      router.push('/experience/admin');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '체험을 시작하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span>직접 체험하기</span>
        <small>관리자부터 고객 관리까지</small>
      </button>
      {open ? (
        <dialog
          ref={noticeRef}
          className={styles.notice}
          aria-modal="true"
          aria-label="체험 시작 안내"
          tabIndex={-1}
          onCancel={(event) => {
            event.preventDefault();
            if (shouldDismissExperienceNotice('Escape', loading)) {
              closeNotice();
            }
          }}
          onKeyDown={(event) => {
            if (
              handleExperienceNoticeKeyDown(event.key, loading, closeNotice)
            ) {
              event.preventDefault();
            }
          }}
        >
          <strong>오늘의 공용 체험 데이터를 사용합니다.</strong>
          <ul>
            <li>모든 체험자가 같은 “금일 체험 청첩장”을 함께 수정합니다.</li>
            <li>매일 00:00(KST)에 초기화됩니다.</li>
            <li>이름·연락처 등 실제 개인정보는 입력하지 마세요.</li>
          </ul>
          <div className={styles.noticeActions}>
            <button type="button" onClick={closeNotice} disabled={loading}>
              취소
            </button>
            <button type="button" onClick={() => void start()} disabled={loading}>
              {loading ? '준비 중' : '체험 시작'}
            </button>
          </div>
          {errorMessage ? (
            <p role="alert">
              {errorMessage} 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
        </dialog>
      ) : null}
    </div>
  );
}
