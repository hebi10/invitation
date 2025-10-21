import React, { useState, useEffect } from 'react';
import styles from './WeddingLoader.module.css';

interface WeddingLoaderProps {
  brideName: string;
  groomName: string;
  onLoadComplete: () => void;
  duration?: number;
  preloadImages?: string[]; // 프리로드할 이미지 URL 배열
  mainImage?: string; // 메인 이미지 URL
}

const WeddingLoader: React.FC<WeddingLoaderProps> = ({
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
    '사랑스러운 순간을 준비하고 있어요...',
    '아름다운 이미지를 불러오고 있어요...',
    '특별한 날을 위한 설정 중...',
    '행복한 순간이 곧 시작됩니다!'
  ];

  // 이미지 프리로딩
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
          resolve(imageUrl); // 실패해도 진행
        };
        img.src = imageUrl;
      });
    });

    Promise.all(preloadPromises).then(() => {
      setImagesLoaded(true);
    });
  }, [mainImage, preloadImages]);

  useEffect(() => {
    const minLoadTime = 1500; // 최소 로딩 시간을 1.5초로 단축
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // 이미지가 로드되면 진행률을 빠르게 증가
      const targetDuration = imagesLoaded ? minLoadTime : duration;
      const timeProgress = Math.min((elapsed / targetDuration) * 100, 100);
      
      // 진행률을 단조증가하도록 보장
      setProgress(prev => Math.max(prev, timeProgress));
      
      // 최소 시간 체크
      if (elapsed >= minLoadTime) {
        setMinTimeElapsed(true);
      }
      
      // 이미지 로딩 완료 + 최소 시간 경과 시 완료
      if (imagesLoaded && minTimeElapsed) {
        clearInterval(progressInterval);
        setTimeout(onLoadComplete, 150);
      }
    }, 50);

    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, Math.max(duration / 4, 800));

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [startTime, duration, onLoadComplete, loadingMessages.length, imagesLoaded, minTimeElapsed]);

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.heartContainer}>
        <div className={styles.heart}></div>
        <div className={styles.sparkles}>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
          <div className={styles.sparkle}></div>
        </div>
      </div>
      
      <h1 className={styles.loadingText}>{groomName} ♥ {brideName}</h1>
      <p className={styles.loadingText}>
        두 사람의 특별한 순간에<br />
        여러분을 초대합니다
      </p>
      
      <div className={styles.progressContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className={styles.loadingText}>{loadingMessages[currentMessage]}</p>
    </div>
  );
};

export default WeddingLoader;
