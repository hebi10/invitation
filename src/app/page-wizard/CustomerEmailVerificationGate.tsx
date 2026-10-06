'use client';

import { useState } from 'react';
import { useAdmin } from '@/contexts';
import styles from './page.module.css';

export default function CustomerEmailVerificationGate() {
  const { authUser, sendVerificationEmail, refreshSession, logout } = useAdmin();
  const [action, setAction] = useState<'resend' | 'refresh' | 'logout' | null>(null);
  const [message, setMessage] = useState('');

  const resend = async () => {
    setAction('resend');
    setMessage('');
    try {
      const result = await sendVerificationEmail();
      setMessage(result.success
        ? result.alreadyVerified
          ? '이메일 인증이 완료되었습니다. 인증 상태를 확인해 주세요.'
          : '인증 메일을 보냈습니다. 받은 편지함과 스팸 메일함을 확인해 주세요.'
        : result.errorMessage ?? '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } catch {
      setMessage('인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAction(null);
    }
  };

  const refresh = async () => {
    setAction('refresh');
    setMessage('');
    try {
      const snapshot = await refreshSession();
      setMessage(snapshot.authUser?.emailVerified
        ? '이메일 인증을 확인했습니다. 청첩장을 불러옵니다.'
        : '아직 인증되지 않았습니다. 이메일의 인증 링크를 먼저 열어 주세요.');
    } catch {
      setMessage('인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAction(null);
    }
  };

  const switchAccount = async () => {
    setAction('logout');
    try {
      await logout();
    } catch {
      setMessage('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAction(null);
    }
  };

  return (
    <main className={styles.page} data-operation-ui>
      <div className={`${styles.shell} ${styles.gateShell}`}>
        <section className={`${styles.centerCard} ${styles.gateCard}`} aria-labelledby="customer-verification-title">
          <p className={styles.eyebrow}>이메일 인증</p>
          <h1 id="customer-verification-title" className={styles.centerTitle}>이메일 인증 후 청첩장을 편집할 수 있습니다.</h1>
          <p className={styles.centerText}>
            {authUser?.email ?? '가입한 이메일'}의 인증 링크를 연 뒤 이 화면에서 인증 상태를 확인해 주세요.
          </p>
          <p className={styles.centerText} role="status" aria-live="polite">{message}</p>
          <div className={styles.inlineActions}>
            <button type="button" className={styles.primaryButton} disabled={action !== null} onClick={() => void refresh()}>
              {action === 'refresh' ? '확인 중' : '인증 상태 확인'}
            </button>
            <button type="button" className={styles.secondaryButton} disabled={action !== null} onClick={() => void resend()}>
              {action === 'resend' ? '전송 중' : '인증 메일 다시 보내기'}
            </button>
            <button type="button" className={styles.secondaryButton} disabled={action !== null} onClick={() => void switchAccount()}>
              다른 계정으로 로그인
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
