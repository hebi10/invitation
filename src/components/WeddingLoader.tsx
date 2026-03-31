import React, { useEffect, useState } from 'react';
import HeartIcon_1 from './HeartIcon_1';
import styles from './WeddingLoader.module.css';

interface WeddingLoaderProps {
  brideName: string;
  groomName: string;
  onLoadComplete: () => void;
  duration?: number;
  preloadImages?: string[];
  mainImage?: string;
}

const loadingMessages = [
  '소중한 초대를 준비하고 있어요...',
  '모바일 청첩장을 여는 중이에요...',
  '두 분의 특별한 순간을 불러오고 있어요...',
  '곧 청첩장이 열립니다.',
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

export default function WeddingLoader({
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
    const minLoadTime = 1500;

    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const targetDuration = imagesLoaded ? minLoadTime : duration;
      const timeProgress = Math.min((elapsed / targetDuration) * 100, 100);

      setProgress((previous) => Math.max(previous, timeProgress));

      if (elapsed >= minLoadTime) {
        setMinTimeElapsed(true);
      }

      if (imagesLoaded && minTimeElapsed) {
        window.clearInterval(progressInterval);
        window.setTimeout(onLoadComplete, 150);
      }
    }, 50);

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
      <div className={styles.heartContainer}>
        <div className={styles.heart}>
          <HeartIcon_1 className={styles.heartImage} priority />
        </div>
        <div className={styles.sparkles}>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
        </div>
      </div>

      <h1 className={styles.loadingText}>
        {groomName} &amp; {brideName}
      </h1>
      <p className={styles.loadingText}>
        두 사람의 특별한 순간에
        <br />
        여러분을 초대합니다
      </p>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <p className={styles.loadingText}>{loadingMessages[currentMessage]}</p>
    </div>
  );
}
