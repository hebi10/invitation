'use client';

import { useState, useEffect } from 'react';
import { preloadImages } from '@/utils/imageOptimization';
import styles from './WeddingLoader_5.module.css';

interface WeddingLoaderProps {
  groomName: string;
  brideName: string;
  onLoadComplete: () => void;
  mainImage?: string;
  preloadImages?: string[];
  duration?: number;
}

export default function WeddingLoader_5({
  groomName,
  brideName,
  onLoadComplete,
  mainImage,
  preloadImages: imagesToPreload = [],
  duration = 1500
}: WeddingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    let animationFrame: number;
    let imageLoadComplete = false;

    const loadImages = async () => {
      const allImages = [
        ...(mainImage ? [mainImage] : []),
        ...imagesToPreload
      ];

      if (allImages.length > 0) {
        try {
          await preloadImages(allImages);
        } catch (error) {
          console.warn('이미지 프리로드 중 오류:', error);
        }
      }
      imageLoadComplete = true;
    };

    loadImages();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(Math.floor(calculatedProgress));

      if (calculatedProgress >= 100 && imageLoadComplete) {
        setIsComplete(true);
        setTimeout(() => {
          onLoadComplete();
        }, 300);
      } else {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [mainImage, imagesToPreload, duration, onLoadComplete]);

  return (
    <div className={`${styles.loader} ${isComplete ? styles.fadeOut : ''}`}>
      {/* 한지 텍스처 배경 */}
      <div className={styles.background}></div>

      {/* 금박 장식 */}
      <svg className={styles.topDecoration} viewBox="0 0 200 20">
        <path d="M 0 10 Q 50 0, 100 10 T 200 10" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M 0 15 Q 50 8, 100 15 T 200 15" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6" />
      </svg>

      {/* 이름 */}
      <div className={styles.names}>
        <span className={styles.name}>{groomName}</span>
        <span className={styles.divider}>·</span>
        <span className={styles.name}>{brideName}</span>
      </div>

      {/* 부제 */}
      <p className={styles.subtitle}>初請狀</p>

      {/* 프로그레스 바 */}
      <div className={styles.progressContainer}>
        <div 
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 프로그레스 텍스트 */}
      <div className={styles.progressText}>{progress}%</div>

      {/* 하단 금박 장식 */}
      <svg className={styles.bottomDecoration} viewBox="0 0 200 20">
        <path d="M 0 10 Q 50 20, 100 10 T 200 10" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M 0 5 Q 50 12, 100 5 T 200 5" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6" />
      </svg>
    </div>
  );
}
