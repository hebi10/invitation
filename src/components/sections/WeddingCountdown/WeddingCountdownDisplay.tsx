'use client';

import { useEffect, useState } from 'react';

interface WeddingCountdownDisplayProps {
  targetDate: Date;
  title?: string;
  showIcon?: boolean;
  styles: Record<string, string>;
  separator: string;
  expiredTitle: string;
  expiredSubtitle: string;
  icon?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function WeddingCountdownDisplay({
  targetDate,
  title = '결혼식까지',
  showIcon = true,
  styles,
  separator,
  expiredTitle,
  expiredSubtitle,
  icon = '✦',
}: WeddingCountdownDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
        setIsExpired(false);
      } else {
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = window.setInterval(calculateTimeLeft, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  if (isExpired) {
    return (
      <div className={styles.countdownContainer}>
        {showIcon ? <span className={styles.icon}>{icon}</span> : null}
        <div className={styles.content}>
          <h4 className={styles.title}>{expiredTitle}</h4>
          <p className={styles.subtitle}>{expiredSubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.countdownContainer}>
      {showIcon ? <span className={styles.icon}>{icon}</span> : null}
      <div className={styles.content}>
        <h4 className={styles.title}>{title}</h4>
        <div className={styles.timeDisplay}>
          <div className={styles.timeUnit}>
            <div className={styles.timeNumber}>{timeLeft.days}</div>
            <div className={styles.timeLabel}>일</div>
          </div>
          <div className={styles.separator}>{separator}</div>
          <div className={styles.timeUnit}>
            <div className={styles.timeNumber}>{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className={styles.timeLabel}>시간</div>
          </div>
          <div className={styles.separator}>{separator}</div>
          <div className={styles.timeUnit}>
            <div className={styles.timeNumber}>{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className={styles.timeLabel}>분</div>
          </div>
          <div className={styles.separator}>{separator}</div>
          <div className={styles.timeUnit}>
            <div className={styles.timeNumber}>{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className={styles.timeLabel}>초</div>
          </div>
        </div>
      </div>
    </div>
  );
}
