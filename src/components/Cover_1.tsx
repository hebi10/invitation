'use client';

import React, { useState, useEffect } from 'react';
import styles from './Cover_1.module.css';

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

const Cover_1 = React.memo(function Cover_1({ 
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
            {groomName} <span className={styles.heart}>♡</span> {brideName}
          </h2>
          <p className={styles.weddingDate}>{weddingDate}</p>
        </div>
      </div>
    </div>
  );
});

export default Cover_1;
