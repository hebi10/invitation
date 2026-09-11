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
  const startingRef = useRef(false);
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
    if (startingRef.current) return;
    startingRef.current = true;
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
      router.push('/experience/my-invitations');
    } catch (error) {
      startingRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : '체험을 시작하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.audience}>채용 담당자이신가요?</span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        프로젝트 체험하기
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
          <strong>직접 수정하고, 완성된 청첩장까지 확인해 보세요.</strong>
          <ol>
            <li>고객 화면에서 미리 연결된 청첩장을 엽니다.</li>
            <li>준비된 이름·일정·사진을 확인하고 일부 내용을 수정합니다.</li>
            <li>저장한 내용이 실제 디자인에 반영되는지 확인합니다.</li>
            <li>관리자로 전환해 제작 후 운영 기능도 살펴봅니다.</li>
          </ol>
          <ul>
            <li>화면마다 안내 팝업이 다음 작업을 알려드립니다. 실제 버튼을 눌러 진행해 주세요.</li>
            <li>다시 시작해도 오늘의 입력 내용을 이어서 사용합니다.</li>
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
