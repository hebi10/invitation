import React, { useEffect, useState } from 'react';
import styles from './WeddingLoader_1.module.css';

interface WeddingLoaderProps {
  brideName: string;
  groomName: string;
  onLoadComplete: () => void;
  duration?: number;
  preloadImages?: string[];
  mainImage?: string;
}

const loadingMessages = [
  '페이지를 차분히 준비하고 있어요...',
  '대표 사진을 먼저 불러오고 있어요...',
  '조금만 기다리면 바로 열립니다...',
  '곧 초대장을 보여드릴게요.',
];

function preloadSingleImage(imageUrl: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = imageUrl;
  });
}

export default function WeddingLoader_1({
  brideName,
  groomName,
  onLoadComplete,
  duration = 3000,
  preloadImages = [],
  mainImage,
}: WeddingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const criticalImages = [mainImage || preloadImages[0]].filter(Boolean) as string[];
    const deferredImages = preloadImages.filter((imageUrl) => imageUrl && imageUrl !== mainImage).slice(0, 1);

    if (criticalImages.length === 0) {
      setImagesLoaded(true);
      return;
    }

    void Promise.all(criticalImages.map(preloadSingleImage)).then(() => {
      if (!cancelled) {
        setImagesLoaded(true);
      }
    });

    if (deferredImages.length > 0 && typeof window !== 'undefined') {
      const preloadDeferredImages = () => {
        deferredImages.forEach((imageUrl) => {
          void preloadSingleImage(imageUrl);
        });
      };

      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(preloadDeferredImages);
      } else {
        globalThis.setTimeout(preloadDeferredImages, 400);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [mainImage, preloadImages]);

  useEffect(() => {
    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const targetDuration = imagesLoaded ? 1800 : duration;
      const timeProgress = Math.min((elapsed / targetDuration) * 100, 100);

      setProgress((previous) => Math.max(previous, timeProgress));

      if (elapsed >= 1800) {
        setMinTimeElapsed(true);
      }

      if (imagesLoaded && minTimeElapsed && timeProgress >= 100) {
        window.clearInterval(progressInterval);
        window.setTimeout(onLoadComplete, 200);
      }
    }, 100);

    const messageInterval = window.setInterval(() => {
      setCurrentMessage((previous) => (previous + 1) % loadingMessages.length);
    }, Math.max(duration / 4, 800));

    return () => {
      window.clearInterval(progressInterval);
      window.clearInterval(messageInterval);
    };
  }, [startTime, duration, onLoadComplete, imagesLoaded, minTimeElapsed]);

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          <div className={styles.circle}></div>
          <div className={styles.dot}></div>
        </div>
      </div>

      <h1 className={styles.coupleNames}>
        {groomName} &amp; {brideName}
      </h1>
      <p className={styles.subtitle}>Wedding Invitation</p>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <p className={styles.loadingMessage}>{loadingMessages[currentMessage]}</p>
    </div>
  );
}
