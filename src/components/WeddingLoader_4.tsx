'use client';

import { useState, useEffect } from 'react';
import { preloadImages } from '@/utils/imageOptimization';
import styles from './WeddingLoader_4.module.css';

interface WeddingLoaderProps {
  groomName: string;
  brideName: string;
  onLoadComplete: () => void;
  mainImage?: string;
  preloadImages?: string[];
  duration?: number;
}

export default function WeddingLoader_4({
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

    // 이미지 프리로드
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

    // 진행률 업데이트
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
      {/* 배경 웨이브 */}
      <div className={styles.waveBackground}>
        <svg viewBox="0 0 1200 600" preserveAspectRatio="none">
          <path 
            className={styles.wave1} 
            d="M0,300 Q300,200 600,300 T1200,300 L1200,600 L0,600 Z" 
          />
          <path 
            className={styles.wave2} 
            d="M0,350 Q300,250 600,350 T1200,350 L1200,600 L0,600 Z" 
          />
          <path 
            className={styles.wave3} 
            d="M0,400 Q300,300 600,400 T1200,400 L1200,600 L0,600 Z" 
          />
        </svg>
      </div>

      {/* 레몬 장식 */}
      <div className={styles.lemonDecoration}>
        <span className={styles.lemon}>🍋</span>
        <span className={styles.lemon} style={{ animationDelay: '0.3s' }}>🍋</span>
        <span className={styles.lemon} style={{ animationDelay: '0.6s' }}>🍋</span>
      </div>

      {/* 이름 */}
      <div className={styles.names}>
        <span className={styles.name}>{groomName}</span>
        <span className={styles.ampersand}>&</span>
        <span className={styles.name}>{brideName}</span>
      </div>

      {/* 부제 */}
      <p className={styles.subtitle}>Wedding Invitation</p>

      {/* 프로그레스 바 */}
      <div className={styles.progressContainer}>
        <div 
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 프로그레스 텍스트 */}
      <div className={styles.progressText}>{progress}%</div>
    </div>
  );
}
