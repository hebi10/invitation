'use client';

import { useState, useEffect } from 'react';
import styles from './Cover.module.css';

interface CoverProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  backgroundImage?: string; // 추가: 선택적 배경 이미지
  preloadComplete?: boolean; // 페이지 로딩 완료 상태
}

export default function Cover({ 
  title, 
  subtitle, 
  imageUrl, 
  brideName, 
  groomName, 
  weddingDate,
  backgroundImage,
  preloadComplete = false
}: CoverProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 페이지 로딩이 완료되었을 때는 이미지 로딩 상태를 표시하지 않음
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

  // 이미지 프리로딩이 완료되면 즉시 이미지 로딩 완료로 처리
  useEffect(() => {
    if (preloadComplete) {
      setImageLoaded(true);
    }
  }, [preloadComplete]);

  return (
    <div className={styles.container} style={containerStyle}>
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
      <h2 className={styles.coupleNames}>{groomName} ♥ {brideName}</h2>
      <p className={styles.weddingDate}>{weddingDate}</p>
    </div>
  );
}
