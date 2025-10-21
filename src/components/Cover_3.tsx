'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './Cover_3.module.css';

interface CoverProps {
  title: string;
  subtitle: string;
  weddingDate: string;
  imageUrl: string;
  groomName: string;
  brideName: string;
  preloadComplete?: boolean;
}

export default function Cover_3({
  title,
  subtitle,
  weddingDate,
  imageUrl,
  groomName,
  brideName,
  preloadComplete = false
}: CoverProps) {
  const [mounted, setMounted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (preloadComplete) {
      setTimeout(() => setShowContent(true), 300);
    }
  }, [preloadComplete]);

  useEffect(() => {
    if (imageUrl && imageLoaded && !showContent) {
      setTimeout(() => setShowContent(true), 300);
    }
  }, [imageLoaded, imageUrl, showContent]);

  return (
    <section className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
        <div className={styles.starsLayer2}></div>
        <div className={styles.starsLayer3}></div>
      </div>

      {/* 메인 이미지 */}
      <div className={`${styles.imageWrapper} ${showContent ? styles.fadeIn : ''}`}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={`${groomName}와 ${brideName}의 결혼식`}
            fill
            priority
            sizes="100vw"
            quality={85}
            className={styles.image}
            onLoad={() => setImageLoaded(true)}
            style={{ objectFit: 'cover' }}
          />
        )}
        <div className={styles.imageOverlay}></div>
      </div>

      {/* 텍스트 콘텐츠 */}
      <div className={`${styles.content} ${showContent ? styles.slideUp : ''}`}>
        <h1 className={styles.title}>
          <span className={styles.titleGlow}>{title}</span>
        </h1>
        
        <p className={styles.subtitle}>{subtitle}</p>
        
        <div className={styles.dateWrapper}>
          <div className={styles.dateLine}></div>
          <p className={styles.date}>{weddingDate}</p>
          <div className={styles.dateLine}></div>
        </div>

        {/* 행성 장식 */}
        <div className={styles.planets}>
          <div className={styles.planet1}></div>
          <div className={styles.planet2}></div>
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className={styles.scrollIndicator}>
        <div className={styles.scrollArrow}></div>
      </div>
    </section>
  );
}
