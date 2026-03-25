'use client';

import { useEffect, useState } from 'react';

import { preloadImages } from '@/utils/imageOptimization';

export interface WeddingLoaderProgressProps {
  groomName: string;
  brideName: string;
  onLoadComplete: () => void;
  mainImage?: string;
  preloadImages?: string[];
  duration?: number;
}

interface SharedWeddingLoaderProgressProps extends WeddingLoaderProgressProps {
  styles: Record<string, string>;
  theme: 'blue' | 'classic';
  subtitle: string;
  separatorText: string;
}

export default function WeddingLoaderProgress({
  groomName,
  brideName,
  onLoadComplete,
  mainImage,
  preloadImages: imagesToPreload = [],
  duration = 1500,
  styles,
  theme,
  subtitle,
  separatorText,
}: SharedWeddingLoaderProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    let animationFrame = 0;
    let completionTimer = 0;
    let imageLoadComplete = false;
    let isMounted = true;

    const loadImages = async () => {
      const allImages = [...(mainImage ? [mainImage] : []), ...imagesToPreload];

      if (allImages.length > 0) {
        try {
          await preloadImages(allImages);
        } catch (error) {
          console.warn('이미지 프리로드 중 오류:', error);
        }
      }

      imageLoadComplete = true;
    };

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);

      if (isMounted) {
        setProgress(Math.floor(nextProgress));
      }

      if (nextProgress >= 100 && imageLoadComplete) {
        if (isMounted) {
          setIsComplete(true);
        }

        completionTimer = window.setTimeout(() => {
          if (isMounted) {
            onLoadComplete();
          }
        }, 300);
        return;
      }

      animationFrame = window.requestAnimationFrame(updateProgress);
    };

    void loadImages();
    animationFrame = window.requestAnimationFrame(updateProgress);

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(completionTimer);
    };
  }, [duration, imagesToPreload, mainImage, onLoadComplete]);

  const separatorClass = 'ampersand' in styles ? styles.ampersand : styles.divider;

  return (
    <div className={`${styles.loader} ${isComplete ? styles.fadeOut : ''}`}>
      {theme === 'blue' && 'waveBackground' in styles && (
        <div className={styles.waveBackground}>
          <svg viewBox="0 0 1200 600" preserveAspectRatio="none">
            <path className={styles.wave1} d="M0,300 Q300,200 600,300 T1200,300 L1200,600 L0,600 Z" />
            <path className={styles.wave2} d="M0,350 Q300,250 600,350 T1200,350 L1200,600 L0,600 Z" />
            <path className={styles.wave3} d="M0,400 Q300,300 600,400 T1200,400 L1200,600 L0,600 Z" />
          </svg>
        </div>
      )}

      {theme === 'blue' && 'lemonDecoration' in styles && 'lemon' in styles && (
        <div className={styles.lemonDecoration}>
          <span className={styles.lemon}>🍋</span>
          <span className={styles.lemon} style={{ animationDelay: '0.3s' }}>
            🍋
          </span>
          <span className={styles.lemon} style={{ animationDelay: '0.6s' }}>
            🍋
          </span>
        </div>
      )}

      {theme === 'classic' && 'background' in styles && <div className={styles.background}></div>}
      {theme === 'classic' && 'topDecoration' in styles && (
        <svg className={styles.topDecoration} viewBox="0 0 200 20">
          <path d="M 0 10 Q 50 0, 100 10 T 200 10" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
          <path d="M 0 15 Q 50 8, 100 15 T 200 15" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6" />
        </svg>
      )}

      <div className={styles.names}>
        <span className={styles.name}>{groomName}</span>
        <span className={separatorClass}>{separatorText}</span>
        <span className={styles.name}>{brideName}</span>
      </div>

      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.progressText}>{progress}%</div>

      {theme === 'classic' && 'bottomDecoration' in styles && (
        <svg className={styles.bottomDecoration} viewBox="0 0 200 20">
          <path d="M 0 10 Q 50 20, 100 10 T 200 10" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
          <path d="M 0 5 Q 50 12, 100 5 T 200 5" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6" />
        </svg>
      )}
    </div>
  );
}
