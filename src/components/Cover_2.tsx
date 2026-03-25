'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { scrollToSection } from '@/utils';
import styles from './Cover_2.module.css';

interface CoverProps {
  title: string;
  subtitle?: string;
  weddingDate: string;
  ceremonyTime?: string;
  venueName?: string;
  primaryActionTargetId?: string;
  imageUrl?: string;
  groomName?: string;
  brideName?: string;
  preloadComplete?: boolean;
}

export default function Cover_2({
  title,
  subtitle,
  weddingDate,
  ceremonyTime,
  venueName,
  primaryActionTargetId = 'wedding-info',
  imageUrl,
  groomName,
  brideName,
  preloadComplete = false
}: CoverProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (preloadComplete) {
      setTimeout(() => setShowContent(true), 300);
    }
  }, [preloadComplete]);

  return (
    <section className={styles.container}>
      <div className={`${styles.content} ${showContent ? styles.visible : ''}`}>
        {imageUrl && (
          <div className={styles.imageWrapper}>
            {!imageLoaded && (
              <div className={styles.imagePlaceholder}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <Image
              src={imageUrl}
              alt="Wedding"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 700px"
              quality={85}
              className={`${styles.image} ${imageLoaded ? styles.loaded : ''}`}
              onLoad={() => setImageLoaded(true)}
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        
        <h1 className={styles.title}>{title}</h1>
        
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        
        <div className={styles.divider}></div>
        
        <div className={styles.eventMeta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>일시</span>
            <span className={styles.metaValue}>
              {weddingDate}
              {ceremonyTime ? ` · ${ceremonyTime}` : ''}
            </span>
          </div>
          {venueName && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>장소</span>
              <span className={styles.metaValue}>{venueName}</span>
            </div>
          )}
        </div>
        
        {groomName && brideName && (
          <div className={styles.names}>
            <span className={styles.name}>{groomName}</span>
            <span className={styles.separator}>&</span>
            <span className={styles.name}>{brideName}</span>
          </div>
        )}

        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => scrollToSection(primaryActionTargetId)}
        >
          예식 정보 보기
        </button>
      </div>
    </section>
  );
}
