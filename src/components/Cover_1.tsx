'use client';

import React, { useState, useEffect } from 'react';
import { scrollToSection } from '@/utils';
import HeartIcon_1 from './HeartIcon_1';
import styles from './Cover_1.module.css';

interface CoverProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  ceremonyTime?: string;
  venueName?: string;
  primaryActionTargetId?: string;
  backgroundImage?: string;
  preloadComplete?: boolean;
}

const Cover_1 = React.memo(function Cover_1({ 
  title, 
  subtitle, 
  imageUrl, 
  brideName, 
  groomName, 
  weddingDate,
  ceremonyTime,
  venueName,
  primaryActionTargetId = 'wedding-info',
  backgroundImage,
  preloadComplete = false
}: CoverProps) {
  const [imageLoaded, setImageLoaded] = useState(preloadComplete);
  const [imageError, setImageError] = useState(false);

  const showImageLoader = !preloadComplete && !imageLoaded && !imageError;

  const containerStyle = backgroundImage 
    ? { 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {};

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  useEffect(() => {
    if (preloadComplete) {
      setImageLoaded(true);
    }
  }, [preloadComplete]);

  return (
    <div className={styles.container} style={containerStyle}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        
        <div className={styles.imageContainer}>
          <img 
            className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
            src={imageUrl} 
            alt="Wedding couple"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              opacity: imageLoaded || preloadComplete ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
          {showImageLoader && (
            <div className={styles.imagePlaceholder}>
              <div className={styles.loadingSpinner}></div>
            </div>
          )}
        </div>
        
        <div className={styles.coupleInfo}>
          <h2 className={styles.coupleNames}>
            {groomName}{' '}
            <span className={styles.heart} aria-hidden="true">
              <HeartIcon_1 className={styles.heartImage} />
            </span>{' '}
            {brideName}
          </h2>
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
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => scrollToSection(primaryActionTargetId)}
          >
            예식 정보 보기
          </button>
        </div>
      </div>
    </div>
  );
});

export default Cover_1;
