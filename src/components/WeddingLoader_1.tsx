import React, { useState, useEffect } from 'react';
import styles from './WeddingLoader_1.module.css';

interface WeddingLoaderProps {
  brideName: string;
  groomName: string;
  onLoadComplete: () => void;
  duration?: number;
  preloadImages?: string[];
  mainImage?: string;
}

const WeddingLoader_1: React.FC<WeddingLoaderProps> = ({
  brideName,
  groomName,
  onLoadComplete,
  duration = 3000,
  preloadImages = [],
  mainImage
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [startTime] = useState(Date.now());

  const loadingMessages = [
    '초대장을 준비하고 있습니다...',
    '이미지를 불러오고 있습니다...',
    '페이지 설정 중...',
    '곧 시작됩니다!'
  ];

  useEffect(() => {
    const imagesToLoad = [];
    if (mainImage) imagesToLoad.push(mainImage);
    imagesToLoad.push(...preloadImages);

    if (imagesToLoad.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    const totalImages = imagesToLoad.length;

    const preloadPromises = imagesToLoad.map((imageUrl) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          resolve(imageUrl);
        };
        img.onerror = () => {
          loadedCount++;
          resolve(imageUrl);
        };
        img.src = imageUrl;
      });
    });

    Promise.all(preloadPromises).then(() => {
      setImagesLoaded(true);
    });
  }, [mainImage, preloadImages]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const timeProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(prev => {
        const newProgress = Math.max(prev, timeProgress);
        return newProgress;
      });
      
      if (elapsed >= 2000) {
        setMinTimeElapsed(true);
      }
      
      if (imagesLoaded && minTimeElapsed && timeProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(onLoadComplete, 200);
      }
    }, 100);

    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, duration / 4);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [startTime, duration, onLoadComplete, loadingMessages.length, imagesLoaded, minTimeElapsed]);

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          <div className={styles.circle}></div>
          <div className={styles.dot}></div>
        </div>
      </div>
      
      <h1 className={styles.coupleNames}>{groomName} & {brideName}</h1>
      <p className={styles.subtitle}>Wedding Invitation</p>
      
      <div className={styles.progressContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className={styles.loadingMessage}>{loadingMessages[currentMessage]}</p>
    </div>
  );
};

export default WeddingLoader_1;
