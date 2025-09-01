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
            <a className={styles.adminButton} href="/admin">Admin 페이지</a>
            <a
              className={styles.linkButton}
              href="https://kmong.com/gig/686626"
              target='_blank'
            >
              판매 페이지
            </a>
          </div>
        </header>
        
        <section>
          <h2 className={styles.title} style={{ fontSize: '2rem' }}>아름다운 청첩장을 위한 완벽한 솔루션</h2>
          <p className={styles.subtitle}>
            저희 청첩장 템플릿 시스템은 여러분의 특별한 날을 위한 
            맞춤형 디지털 청첩장을 제공합니다.
          </p>
          
          <ul style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem', 
            listStyle: 'none', 
            padding: 0,
            marginBottom: '2rem',
          }}>
            <li>📱 반응형 디자인</li>
            <li>🎨 아름다운 템플릿</li>
            <li>📸 사진 갤러리</li>
            <li>📅 일정 안내</li>
            <li>🗺️ 위치 정보</li>
            <li>💬 방명록 기능</li>
            <li>💳 축의금 안내</li>
            <li>⚡ 빠른 로딩</li>
          </ul>
          
          <p className={styles.subtitle}>
            관리자 페이지에서 생성된 청첩장들을 확인하실 수 있습니다.
          </p>
        </section>
      </div>
    </>
  );
}
