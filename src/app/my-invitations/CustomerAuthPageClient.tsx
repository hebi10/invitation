'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { useAdmin } from '@/contexts';

import styles from './page.module.css';

interface CustomerAuthPageClientProps {
  title: string;
  description: string;
  authTitle: string;
  authDescription: string;
  authHelperText?: string;
  initialMode?: 'login' | 'register';
}

export default function CustomerAuthPageClient({
  title,
  description,
  authTitle,
  authDescription,
  authHelperText,
  initialMode = 'login',
}: CustomerAuthPageClientProps) {
  const router = useRouter();
  const { authUser, isLoggedIn, isAdminLoading } = useAdmin();

  useEffect(() => {
    if (isAdminLoading || !isLoggedIn) {
      return;
    }

    if (initialMode === 'register' && authUser && !authUser.emailVerified) {
      return;
    }

    router.replace('/my-invitations');
  }, [authUser, initialMode, isAdminLoading, isLoggedIn, router]);

  if (isAdminLoading) {
    return (
      <main className={styles.page} data-operation-ui>
        <div className={`${styles.shell} ${styles.authShell}`}>
          <section className={styles.loading}>로그인 상태를 확인하는 중입니다.</section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page} data-operation-ui>
      <div className={`${styles.shell} ${styles.authShell}`}>
        <section className={styles.authIntro}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.heroActions}>
            <Link className={styles.backLink} href="/">
              홈으로 돌아가기
            </Link>
          </div>
        </section>

        <FirebaseAuthLoginCard
          title={authTitle}
          hideTitle
          description={authDescription}
          helperText={authHelperText}
          initialMode={initialMode}
        />
      </div>
    </main>
  );
}
