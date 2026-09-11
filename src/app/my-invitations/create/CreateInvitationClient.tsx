"use client";

import Link from 'next/link';
import { useAdmin } from '@/contexts';
import styles from '../page.module.css';

export default function CreateInvitationClient() {
  const { isAdminLoading, isAdminLoggedIn } = useAdmin();
  return (
    <main className={styles.page} data-operation-ui>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <h1 className={styles.title}>초대장 생성 안내</h1>
          <p className={styles.description}>
            {isAdminLoading ? '로그인 상태를 확인하는 중입니다.' : '초대장 생성과 고객 연결은 관리자가 진행합니다. 연결이 완료되면 내 이벤트에서 내용을 편집할 수 있습니다.'}
          </p>
          <div className={styles.heroActions}>
            {isAdminLoggedIn ? <Link className={styles.primaryButton} href="/page-wizard/">초대장 생성</Link> : null}
            <Link className={styles.secondaryButton} href="/my-invitations/">내 이벤트로 이동</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
