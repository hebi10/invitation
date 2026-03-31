'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { scrollToSection } from '@/utils';
import styles from './Cover_3.module.css';

interface CoverProps {
  title: string;
  subtitle: string;
  weddingDate: string;
  ceremonyTime?: string;
  venueName?: string;
  primaryActionTargetId?: string;
  imageUrl: string;
  groomName: string;
  brideName: string;
  preloadComplete?: boolean;
}

export default function Cover_3({
  title,
  subtitle,
  weddingDate,
  ceremonyTime,
  venueName,
  primaryActionTargetId = 'wedding-info',
  imageUrl,
  groomName,
  brideName,
  preloadComplete = false,
}: CoverProps) {
  const [imageLoaded, setImageLoaded] = useState(preloadComplete);
  const [showContent, setShowContent] = useState(preloadComplete);

  useEffect(() => {
    if (preloadComplete) {
      setImageLoaded(true);
      setShowContent(true);
    }

    return undefined;
  }, [preloadComplete]);

  useEffect(() => {
    if (imageUrl && imageLoaded && !showContent) {
      const timer = window.setTimeout(() => setShowContent(true), 300);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [imageLoaded, imageUrl, showContent]);

  return (
    <section className={styles.container}>
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
        <div className={styles.starsLayer2}></div>
        <div className={styles.starsLayer3}></div>
      </div>

      <div
        className={`${styles.imageWrapper} ${!preloadComplete && showContent ? styles.fadeIn : ''}`}
        style={preloadComplete ? { opacity: 1, transform: 'scale(1)' } : undefined}
      >
        {imageUrl ? (
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
        ) : null}
        <div className={styles.imageOverlay}></div>
      </div>

      <div
        className={`${styles.content} ${!preloadComplete && showContent ? styles.slideUp : ''}`}
        style={preloadComplete ? { opacity: 1, transform: 'translateY(0)' } : undefined}
      >
        <h1 className={styles.title}>
          <span className={styles.titleGlow}>{title}</span>
        </h1>

        <p className={styles.subtitle}>{subtitle}</p>

        <div className={styles.dateWrapper}>
          <div className={styles.dateLine}></div>
          <p className={styles.date}>{weddingDate}</p>
          <div className={styles.dateLine}></div>
        </div>

        <div className={styles.infoPanel}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>시간</span>
            <span className={styles.infoValue}>{ceremonyTime ?? '오후 예식'}</span>
          </div>
          {venueName ? (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>장소</span>
              <span className={styles.infoValue}>{venueName}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => scrollToSection(primaryActionTargetId)}
        >
          예식 정보 보기
        </button>

        <div className={styles.planets}>
          <div className={styles.planet1}></div>
          <div className={styles.planet2}></div>
        </div>
      </div>

      <div className={styles.scrollIndicator}>
        <div className={styles.scrollArrow}></div>
      </div>
    </section>
  );
}
