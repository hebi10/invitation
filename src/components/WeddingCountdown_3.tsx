'use client';

import React, { useState, useEffect } from 'react';
import styles from './WeddingCountdown_3.module.css';

interface WeddingCountdownProps {
  targetDate: Date;
  title?: string;
  showIcon?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function WeddingCountdown_3({
  targetDate,
  title = "결혼식까지",
  showIcon = true
}: WeddingCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, isClient]);

  if (!isClient) {
    return (
      <div className={styles.countdownContainer}>
        <div className={styles.spaceBackground}>
          <div className={styles.stars}></div>
        </div>
        <div className={styles.content}>
          <div className={styles.titleWrapper}>
            <div className={styles.starIcon}>✦</div>
            <h4 className={styles.title}>{title}</h4>
            <div className={styles.starIcon}>✦</div>
          </div>
          <div className={styles.timeDisplay}>
            <div className={styles.timeUnit}>
              <div className={styles.timeBox}>
                <div className={styles.timeNumber}>0</div>
              </div>
              <div className={styles.timeLabel}>Days</div>
            </div>
            <div className={styles.separator}>:</div>
            <div className={styles.timeUnit}>
              <div className={styles.timeBox}>
                <div className={styles.timeNumber}>00</div>
              </div>
              <div className={styles.timeLabel}>Hours</div>
            </div>
            <div className={styles.separator}>:</div>
            <div className={styles.timeUnit}>
              <div className={styles.timeBox}>
                <div className={styles.timeNumber}>00</div>
              </div>
              <div className={styles.timeLabel}>Minutes</div>
            </div>
            <div className={styles.separator}>:</div>
            <div className={styles.timeUnit}>
              <div className={styles.timeBox}>
                <div className={styles.timeNumber}>00</div>
              </div>
              <div className={styles.timeLabel}>Seconds</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={styles.countdownContainer}>
        <div className={styles.spaceBackground}>
          <div className={styles.stars}></div>
        </div>
        <div className={styles.content}>
          <div className={styles.expiredWrapper}>
            <div className={styles.expiredIcon}>✨</div>
            <h4 className={styles.expiredTitle}>축하합니다!</h4>
            <p className={styles.expiredSubtitle}>행복한 결혼식이 이미 시작되었습니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.countdownContainer}>
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>
      <div className={styles.content}>
        <div className={styles.titleWrapper}>
          <div className={styles.starIcon}>✦</div>
          <h4 className={styles.title}>{title}</h4>
          <div className={styles.starIcon}>✦</div>
        </div>
        <div className={styles.timeDisplay}>
          <div className={styles.timeUnit}>
            <div className={styles.timeBox}>
              <div className={styles.timeNumber}>{timeLeft.days}</div>
              <div className={styles.glow}></div>
            </div>
            <div className={styles.timeLabel}>Days</div>
          </div>
          <div className={styles.separator}>:</div>
          <div className={styles.timeUnit}>
            <div className={styles.timeBox}>
              <div className={styles.timeNumber}>{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className={styles.glow}></div>
            </div>
            <div className={styles.timeLabel}>Hours</div>
          </div>
          <div className={styles.separator}>:</div>
          <div className={styles.timeUnit}>
            <div className={styles.timeBox}>
              <div className={styles.timeNumber}>{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className={styles.glow}></div>
            </div>
            <div className={styles.timeLabel}>Minutes</div>
          </div>
          <div className={styles.separator}>:</div>
          <div className={styles.timeUnit}>
            <div className={styles.timeBox}>
              <div className={styles.timeNumber}>{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div className={styles.glow}></div>
            </div>
            <div className={styles.timeLabel}>Seconds</div>
          </div>
        </div>
      </div>
      {/* 장식 요소 */}
      <div className={styles.decorations}>
        <div className={styles.orbit}></div>
        <div className={styles.planet}></div>
      </div>
    </div>
  );
}
