'use client';

import { useState, useEffect } from 'react';
import styles from './WeddingCountdown_5.module.css';

interface CountdownProps {
  targetDate: Date;
  title?: string;
}

export default function WeddingCountdown_5({ targetDate, title = "결혼식까지" }: CountdownProps) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const calculateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);

    return () => clearInterval(timer);
  }, [targetDate, isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <div className={styles.countdown}>
      <h3 className={styles.title}>{title}</h3>
      
      <div className={styles.timerGrid}>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.days}</div>
          <div className={styles.label}>日</div>
        </div>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.hours}</div>
          <div className={styles.label}>時</div>
        </div>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.minutes}</div>
          <div className={styles.label}>分</div>
        </div>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.seconds}</div>
          <div className={styles.label}>秒</div>
        </div>
      </div>
    </div>
  );
}
