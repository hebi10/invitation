'use client';

import { useEffect, useState } from 'react';

interface WeddingCountdownCompactProps {
  targetDate: Date;
  title?: string;
  styles: Record<string, string>;
  labels: {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
}

export default function WeddingCountdownCompact({
  targetDate,
  title = '결혼식까지',
  styles,
  labels,
}: WeddingCountdownCompactProps) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const calculateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateCountdown();
    const timer = window.setInterval(calculateCountdown, 1000);

    return () => window.clearInterval(timer);
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
          <div className={styles.label}>{labels.days}</div>
        </div>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.hours}</div>
          <div className={styles.label}>{labels.hours}</div>
        </div>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.minutes}</div>
          <div className={styles.label}>{labels.minutes}</div>
        </div>
        <div className={styles.timerItem}>
          <div className={styles.number}>{countdown.seconds}</div>
          <div className={styles.label}>{labels.seconds}</div>
        </div>
      </div>
    </div>
  );
}
