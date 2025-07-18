'use client';

import Head from 'next/head';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>모바일 청첩장 - 아름다운 시작을 함께하세요</title>
        <meta name="description" content="특별한 날을 더욱 특별하게 만들어줄 모바일 청첩장입니다. 소중한 분들과 함께 나누는 행복한 순간을 아름답게 전해드립니다." />
        <meta name="keywords" content="모바일청첩장,웨딩,결혼식,청첩장,결혼,웨딩카드" />
        <meta property="og:title" content="모바일 청첩장 - 아름다운 시작을 함께하세요" />
        <meta property="og:description" content="특별한 날을 더욱 특별하게 만들어줄 모바일 청첩장입니다." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=600&fit=crop" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="모바일 청첩장" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="모바일 청첩장 - 아름다운 시작을 함께하세요" />
        <meta name="twitter:description" content="특별한 날을 더욱 특별하게 만들어줄 모바일 청첩장입니다." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=600&fit=crop" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Wedding Invitation</h1>
          <p className={styles.subtitle}>청첩장 템플릿 시스템</p>
          <p className={styles.subtitle}>맞춤형 디지털 청첩장을 만들어보세요</p>
          <a className={styles.adminButton} href="/admin">Admin 페이지</a>
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
