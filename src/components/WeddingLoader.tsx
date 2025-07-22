import React, { useState, useEffect } from 'react';
import styles from './WeddingLoader.module.css';

interface WeddingLoaderProps {
  brideName: string;
  groomName: string;
  onLoadComplete: () => void;
  duration?: number;
}

const WeddingLoader: React.FC<WeddingLoaderProps> = ({
  brideName,
  groomName,
  onLoadComplete,
  duration = 3000
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const loadingMessages = [
    '사랑스러운 순간을 준비하고 있어요...',
    '아름다운 청첩장을 만들고 있어요...',
    '특별한 날을 위한 설정 중...',
    '행복한 순간이 곧 시작됩니다!'
  ];

  useEffect(() => {
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(calculatedProgress);
      
      if (calculatedProgress >= 100) {
        clearInterval(progressInterval);
        setTimeout(onLoadComplete, 200); // 더 빠른 응답을 위해 500ms에서 200ms로 단축
      }
    }, 50); // 더 부드러운 애니메이션을 위해 100ms에서 50ms로 단축

    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, duration / 4);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [duration, onLoadComplete, loadingMessages.length]);

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
