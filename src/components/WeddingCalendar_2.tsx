'use client';

import { useState, useEffect } from 'react';
import styles from './WeddingCalendar_2.module.css';

interface WeddingCalendarProps {
  weddingDate: Date;
}

export default function WeddingCalendar_2({ weddingDate }: WeddingCalendarProps) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const calculateCountdown = () => {
      const now = new Date();
      const difference = weddingDate.getTime() - now.getTime();

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
  }, [weddingDate, isClient]);

  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const day = weddingDate.getDate();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = new Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(d);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Wedding Day</h2>
      
      {isClient && (
        <div className={styles.countdownSection}>
          <div className={styles.countdownItem}>
            <div className={styles.countdownValue}>{countdown.days}</div>
            <div className={styles.countdownLabel}>Days</div>
          </div>
          <div className={styles.countdownDivider}>:</div>
          <div className={styles.countdownItem}>
            <div className={styles.countdownValue}>{String(countdown.hours).padStart(2, '0')}</div>
            <div className={styles.countdownLabel}>Hours</div>
          </div>
          <div className={styles.countdownDivider}>:</div>
          <div className={styles.countdownItem}>
            <div className={styles.countdownValue}>{String(countdown.minutes).padStart(2, '0')}</div>
            <div className={styles.countdownLabel}>Minutes</div>
          </div>
          <div className={styles.countdownDivider}>:</div>
          <div className={styles.countdownItem}>
            <div className={styles.countdownValue}>{String(countdown.seconds).padStart(2, '0')}</div>
            <div className={styles.countdownLabel}>Seconds</div>
          </div>
        </div>
      )}

      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          {year}년 {monthNames[month]}
        </div>
        
        <div className={styles.weekHeader}>
          {dayNames.map((dayName, index) => (
            <div 
              key={index} 
              className={`${styles.dayName} ${index === 0 ? styles.sunday : ''} ${index === 6 ? styles.saturday : ''}`}
            >
              {dayName}
            </div>
          ))}
        </div>
        
        <div className={styles.calendarBody}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className={styles.week}>
              {week.map((d, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`${styles.day} ${
                    d === day ? styles.weddingDay : ''
                  } ${
                    dayIndex === 0 && d ? styles.sunday : ''
                  } ${
                    dayIndex === 6 && d ? styles.saturday : ''
                  } ${
                    !d ? styles.empty : ''
                  }`}
                >
                  {d || ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
