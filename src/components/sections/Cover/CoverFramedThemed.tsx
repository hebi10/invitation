'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { scrollToSection } from '@/utils';

interface CoverFramedThemedProps {
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
  styles: Record<string, string>;
  renderNames: (args: {
    styles: Record<string, string>;
    groomName: string;
    brideName: string;
  }) => ReactNode;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
}

export default function CoverFramedThemed({
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
  preloadComplete = false,
  styles,
  renderNames,
  beforeContent,
  afterContent,
}: CoverFramedThemedProps) {
  const [imageLoaded, setImageLoaded] = useState(preloadComplete);
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(imageUrl);

  useEffect(() => {
    if (preloadComplete) {
      setImageLoaded(true);
    }
  }, [preloadComplete]);

  const showImageLoader = hasImage && !preloadComplete && !imageLoaded && !imageError;
  const containerStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;
  const imageClassName = [styles.image, imageLoaded && styles.imageLoaded]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.container} style={containerStyle}>
      <div className={styles.content}>
        {beforeContent}

        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

        <div className={styles.imageContainer}>
          {hasImage ? (
            <img
              className={imageClassName}
              src={imageUrl}
              alt="Wedding couple"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              style={{
                opacity: imageLoaded || preloadComplete ? 1 : 0,
                transition: 'opacity 0.4s ease-in-out',
              }}
            />
          ) : null}
          {showImageLoader ? (
            <div className={styles.imagePlaceholder}>
              <div className={styles.loadingSpinner}></div>
            </div>
          ) : null}
        </div>

        <div className={styles.coupleInfo}>
          {renderNames({ styles, groomName, brideName })}

          <div className={styles.eventMeta}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>일시</span>
              <span className={styles.metaValue}>
                {weddingDate}
                {ceremonyTime ? ` · ${ceremonyTime}` : ''}
              </span>
            </div>
            {venueName ? (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>장소</span>
                <span className={styles.metaValue}>{venueName}</span>
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
        </div>

        {afterContent}
      </div>
    </div>
  );
}
