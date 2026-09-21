'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import MobileAccountReturn from '@/app/_components/MobileAccountReturn';
import { isMobileAccountSource } from '@/lib/mobileAccountReturn';

import { sendFirebasePasswordReset } from '@/services/adminAuth';

import cardStyles from '@/app/_components/FirebaseAuthLoginCard.module.css';
import styles from '@/app/my-invitations/page.module.css';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const mobileReturn = isMobileAccountSource(searchParams.get('from'));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setSent(false);
    try {
      const result = await sendFirebasePasswordReset(email);
      if (result.success) setSent(true);
      else setError(result.errorMessage ?? '잠시 후 다시 시도해 주세요.');
    } catch {
      setError('재설정 메일을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page} data-operation-ui>
      <div className={`${styles.shell} ${styles.authShell}`}>
        <section className={styles.authIntro}>
          <h1 className={styles.title}>비밀번호 재설정</h1>
          <p className={styles.description}>가입한 이메일로 비밀번호 재설정 링크를 요청하세요.</p>
        </section>
        <form className={cardStyles.form} onSubmit={handleSubmit}>
          <label className={cardStyles.field}>
            <span className={cardStyles.label}>가입한 이메일</span>
            <input className={cardStyles.input} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" disabled={loading} />
          </label>
          <p className={cardStyles.helper}>Google로 가입하셨다면 Google 로그인을 이용해 주세요. 재설정을 마친 뒤 앱으로 돌아가 새 비밀번호로 로그인해 주세요.</p>
          {sent ? <p className={cardStyles.notice} role="status">등록된 이메일이라면 재설정 링크가 전송됩니다. 받은 편지함과 스팸 메일함을 확인해 주세요.</p> : null}
          {error ? <p className={cardStyles.error} role="alert">{error}</p> : null}
          <button className={cardStyles.primaryButton} type="submit" disabled={loading}>{loading ? '요청 중...' : '재설정 메일 요청'}</button>
          <Link className={styles.backLink} href="/login">로그인으로 돌아가기</Link>
        </form>
        {mobileReturn ? <MobileAccountReturn passwordReset /> : null}
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<main className={styles.page}>화면을 불러오는 중입니다.</main>}><ForgotPasswordContent /></Suspense>;
}
