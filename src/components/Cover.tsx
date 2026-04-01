'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { scrollToSection } from '@/utils';
import HeartIcon from './HeartIcon';
import styles from './Cover.module.css';

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
  backgroundImage?: string; // 추가: 선택적 배경 이미지
  preloadComplete?: boolean; // 페이지 로딩 완료 상태
}

const Cover = React.memo(function Cover({ 
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
  const hasImage = Boolean(imageUrl);

  // 페이지 로딩이 완료되었을 때는 이미지 로딩 상태를 표시하지 않음
  const showImageLoader = hasImage && !preloadComplete && !imageLoaded && !imageError;

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
      <h1 className={`${styles.title} ${styles.invitationTitle}`}>{title || 'Invitation'}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <div className={styles.imageContainer}>
        {hasImage ? (
          <Image
            className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
            src={imageUrl}
            alt="Wedding couple"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 700px"
            quality={85}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              objectFit: 'cover',
              opacity: imageLoaded || preloadComplete ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        ) : null}
        {showImageLoader && (
          <div className={styles.imagePlaceholder}>
            <div className={styles.loadingSpinner}></div>
          </div>
        )}
      </div>
      <h2 className={styles.coupleNames}>
        {groomName} 
        <span className={styles.pointColor}>
          <HeartIcon className={styles.pointHeart} />
        </span>
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
  );
});

export default Cover;
