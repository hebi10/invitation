'use client';

import React, { useState, useEffect } from 'react';
import styles from './Cover_5.module.css';

interface CoverProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  backgroundImage?: string;
  preloadComplete?: boolean;
}

const Cover_5 = React.memo(function Cover_5({ 
  title, 
  subtitle, 
  imageUrl, 
  brideName, 
  groomName, 
  weddingDate,
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
        {/* 상단 금박 장식 */}
        <svg className={styles.topDecoration} viewBox="0 0 200 20" preserveAspectRatio="none">
          <path d="M 0 10 Q 50 0, 100 10 T 200 10" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
          <path d="M 0 15 Q 50 8, 100 15 T 200 15" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6" />
        </svg>

        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        
        <div className={styles.imageContainer}>
          <img 
            className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
            src={imageUrl} 
            alt="Wedding couple"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              opacity: imageLoaded || preloadComplete ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out'
            }}
          />
          {showImageLoader && (
            <div className={styles.imagePlaceholder}>
              <div className={styles.loadingSpinner}></div>
            </div>
          )}
        </div>
        
        <div className={styles.coupleInfo}>
          <div className={styles.names}>
            <span className={styles.groomName}>{groomName}</span>
            <span className={styles.divider}>·</span>
            <span className={styles.brideName}>{brideName}</span>
          </div>
          <p className={styles.weddingDate}>{weddingDate}</p>
        </div>

        {/* 하단 금박 장식 */}
        <svg className={styles.bottomDecoration} viewBox="0 0 200 20" preserveAspectRatio="none">
          <path d="M 0 10 Q 50 20, 100 10 T 200 10" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
          <path d="M 0 5 Q 50 12, 100 5 T 200 5" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
});

export default Cover_5;
