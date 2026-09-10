import Link from 'next/link';

import styles from './not-found.module.css';

export default function NotFoundPage() {
  return (
    <main className={styles.page} data-operation-ui>
      <section className={styles.content} aria-labelledby="not-found-title">
        <h1 id="not-found-title" className={styles.title}>
          페이지를 찾을 수 없습니다.
        </h1>
        <p className={styles.description}>
          주소가 올바른지 확인해 주세요.
          <br />
          전달받은 청첩장이라면 보내주신 분께 링크를 다시 요청해 주세요.
        </p>
        <nav className={styles.actions} aria-label="다른 페이지로 이동">
          <Link href="/" className={styles.primary}>메인으로 이동</Link>
          <Link href="/admin" className={styles.secondary}>관리자 페이지</Link>
        </nav>
        <p className={styles.code}>오류 404</p>
      </section>
    </main>
  );
}
