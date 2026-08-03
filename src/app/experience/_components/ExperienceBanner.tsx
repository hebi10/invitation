'use client';

import { useState } from 'react';

import { useExperience } from '@/contexts';

import styles from './ExperienceBanner.module.css';

export default function ExperienceBanner() {
  const { session, switchRole, endExperience } = useExperience();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const changeRole = async (role: 'admin' | 'customer') => {
    setBusy(true);
    setErrorMessage('');
    try {
      await switchRole(role);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '역할을 변경하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className={styles.banner} aria-label="체험 모드 안내">
      <div className={styles.copy}>
        <strong>체험 중</strong>
        <span>
          입력 내용은 오늘의 체험자와 공유되며 매일 00:00에 초기화됩니다. 개인정보는 입력하지 마세요.
        </span>
      </div>
      <div className={styles.actions}>
        <div className={styles.roles} aria-label="체험 역할 전환">
          <button
            type="button"
            aria-pressed={session.role === 'admin'}
            disabled={busy}
            onClick={() => void changeRole('admin')}
          >
            관리자
          </button>
          <button
            type="button"
            aria-pressed={session.role === 'customer'}
            disabled={busy}
            onClick={() => void changeRole('customer')}
          >
            고객
          </button>
        </div>
        <button
          type="button"
          className={styles.exit}
          disabled={busy}
          onClick={() => void endExperience()}
        >
          체험 종료
        </button>
      </div>
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
    </aside>
  );
}
