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
    '설렘을 차곡차곡 담는 중입니다…',
    '추억 사진을 정리하는 중입니다…',
    '마음을 전할 페이지를 완성 중입니다…',
    '잠시 후 초대장을 열어드립니다!'
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
