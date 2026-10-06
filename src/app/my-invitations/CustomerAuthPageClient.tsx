'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import MobileAccountReturn from '@/app/_components/MobileAccountReturn';
import { shouldRedirectCustomerToDashboard } from '@/lib/mobileAccountReturn';
import { readCustomerAuthReturnTo } from '@/lib/customerAuthReturn';
import { useAdmin } from '@/contexts';

import styles from './page.module.css';

interface CustomerAuthPageClientProps {
  title: string;
  description: string;
  authTitle: string;
  authDescription: string;
  authHelperText?: string;
  initialMode?: 'login' | 'register';
  mobileReturn?: boolean;
}

export default function CustomerAuthPageClient({
  title,
  description,
  authTitle,
  authDescription,
  authHelperText,
  initialMode = 'login',
  mobileReturn = false,
}: CustomerAuthPageClientProps) {
  const router = useRouter();
  const { authUser, isLoggedIn, isAdminLoading } = useAdmin();
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [returnToReady, setReturnToReady] = useState(false);

  useEffect(() => {
    setReturnTo(readCustomerAuthReturnTo(window.location.hash));
    setReturnToReady(true);
  }, []);

  useEffect(() => {
    if (!returnToReady || !shouldRedirectCustomerToDashboard({
      mobileReturn,
      loading: isAdminLoading,
      loggedIn: isLoggedIn,
      register: initialMode === 'register',
      emailVerified: authUser?.emailVerified ?? false,
    })) {
      return;
    }

    router.replace(returnTo ?? '/my-invitations');
  }, [authUser, initialMode, isAdminLoading, isLoggedIn, mobileReturn, returnTo, returnToReady, router]);

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

        {mobileReturn && isLoggedIn && authUser?.emailVerified ? (
          <p className={styles.description} role="status">계정 확인이 완료되었습니다. 앱으로 돌아가 제작을 이어가세요.</p>
        ) : (
          <FirebaseAuthLoginCard
            title={authTitle}
            hideTitle
            description={authDescription}
            helperText={authHelperText}
            initialMode={initialMode}
            returnTo={returnTo}
          />
        )}
        {mobileReturn ? <MobileAccountReturn /> : null}
      </div>
    </main>
  );
}
