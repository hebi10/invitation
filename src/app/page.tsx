'use client';

import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Wedding Invitation</h1>
          <p className={styles.subtitle}>청첩장 템플릿 시스템</p>
          <p className={styles.subtitle}>맞춤형 디지털 청첩장을 만들어보세요</p>
          <div className={styles.buttonGroup}>
            <a className={styles.adminButton} href="/admin">
              Admin 페이지
            </a>
            <a
              className={styles.linkButton}
              href="https://kmong.com/gig/686626"
              target="_blank"
              rel="noreferrer"
            >
              판매 페이지
            </a>
            <a
              className={styles.linkButton}
              href="https://hebi10.notion.site/Nextjs-Firebase-23f8b702e1b880e08f14fc063e851791?pvs=74"
              target="_blank"
              rel="noreferrer"
            >
              작업 문서 (노션)
            </a>
          </div>
        </header>

        <section className={styles.contentSection}>
          <div className={styles.sectionBadge}>디지털 청첩장 제작</div>
          <h2 className={styles.sectionTitle}>아름다운 청첩장을 위한 완벽한 솔루션</h2>
          <p className={styles.sectionDescription}>
            저희 청첩장 템플릿 시스템은 여러분의 특별한 날을 위한
            맞춤형 디지털 청첩장을 제공합니다.
          </p>

          <ul className={styles.featuresGrid}>
            <li className={styles.featureItem}>📱 반응형 디자인</li>
            <li className={styles.featureItem}>🎨 아름다운 템플릿</li>
            <li className={styles.featureItem}>📸 사진 갤러리</li>
            <li className={styles.featureItem}>📅 일정 안내</li>
            <li className={styles.featureItem}>🗺️ 위치 정보</li>
            <li className={styles.featureItem}>💬 방명록 기능</li>
            <li className={styles.featureItem}>💳 축의금 안내</li>
            <li className={styles.featureItem}>⚡ 빠른 로딩</li>
          </ul>

          <p className={styles.sectionFooter}>
            관리자 페이지에서 생성된 청첩장들을 확인하실 수 있습니다.
          </p>
        </section>
      </div>
    </>
  );
}
