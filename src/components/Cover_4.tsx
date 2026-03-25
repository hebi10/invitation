'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { scrollToSection } from '@/utils';
import styles from './Cover_4.module.css';

interface CoverProps {
  title: string;
  subtitle: string;
  weddingDate: string;
  ceremonyTime?: string;
  venueName?: string;
  primaryActionTargetId?: string;
  imageUrl: string;
  brideName: string;
  groomName: string;
  preloadComplete?: boolean;
}

export default function Cover_4({
  title,
  subtitle,
  weddingDate,
  ceremonyTime,
  venueName,
  primaryActionTargetId = 'wedding-info',
  imageUrl,
  brideName,
  groomName,
  preloadComplete = false
}: CoverProps) {
  const [mounted, setMounted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <section className={styles.cover} aria-label="웨딩 커버">
      {/* 메인 이미지 영역 */}
      <div className={styles.imageContainer}>
        {imageUrl && (
          <div className={styles.imageWrapper}>
            <Image
              src={imageUrl}
              alt={`${groomName}과 ${brideName}의 웨딩 사진`}
              fill
              sizes="100vw"
              quality={90}
              priority
              className={`${styles.mainImage} ${imageLoaded ? styles.loaded : ''}`}
              onLoad={() => setImageLoaded(true)}
            />
            <div className={styles.imageOverlay} />
          </div>
        )}
        
        {/* 이미지 위 텍스트 */}
        <div className={styles.imageTextOverlay}>
          <div className={styles.names}>
            <span className={styles.groom}>{groomName}</span>
            <span className={styles.ampersand}>&</span>
            <span className={styles.bride}>{brideName}</span>
          </div>
        </div>
      </div>

      {/* 하단 정보 영역 - 플랫 디자인 */}
      <div className={styles.infoSection}>
        <div className={styles.lemonAccent} aria-hidden="true">🍋</div>
        
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        
        <div className={styles.divider} />

        <div className={styles.infoStack}>
          <time className={styles.date} dateTime={weddingDate}>
            {weddingDate}
          </time>
          {ceremonyTime && <p className={styles.time}>{ceremonyTime}</p>}
          {venueName && <p className={styles.venue}>{venueName}</p>}
        </div>

        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => scrollToSection(primaryActionTargetId)}
        >
          예식 정보 보기
        </button>
        
        <div className={styles.wavePattern} aria-hidden="true">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
          </svg>
        </div>
      </div>
    </section>
  );
}
