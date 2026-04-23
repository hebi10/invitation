'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { useAdmin } from '@/contexts';

import styles from './page.module.css';

interface CustomerAuthPageClientProps {
  eyebrow: string;
  title: string;
  description: string;
  authTitle: string;
  authDescription: string;
  initialMode?: 'login' | 'register';
}

export default function CustomerAuthPageClient({
  eyebrow,
  title,
  description,
  authTitle,
  authDescription,
  initialMode = 'login',
}: CustomerAuthPageClientProps) {
  const router = useRouter();
  const { isLoggedIn, isAdminLoading } = useAdmin();

  useEffect(() => {
    if (isAdminLoading || !isLoggedIn) {
      return;
    }

    router.replace('/my-invitations');
  }, [isAdminLoading, isLoggedIn, router]);

  if (isAdminLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.loading}>로그인 상태를 확인하는 중입니다.</section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryButton} href="/my-invitations">
              내 청첩장으로 이동
            </Link>
          </div>
        </section>

        <FirebaseAuthLoginCard
          title={authTitle}
          description={authDescription}
          initialMode={initialMode}
        />
      </div>
    </main>
  );
}
