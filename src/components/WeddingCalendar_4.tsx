'use client';

import { useState, useEffect } from 'react';
import styles from './WeddingCalendar_4.module.css';
import WeddingCountdown_4 from './WeddingCountdown_4';

interface WeddingCalendarProps {
  weddingDate: Date;
  showCountdown?: boolean;
  countdownTitle?: string;
}

export default function WeddingCalendar_4({ 
  weddingDate,
  showCountdown = false,
  countdownTitle = "결혼식까지"
}: WeddingCalendarProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
      {/* 레몬 장식 */}
      <div className={styles.lemonDecoration}>🍋</div>

      <h2 className={styles.title}>Wedding Day</h2>
      <p className={styles.subtitle}>우리의 특별한 날</p>

      {/* 달력 - 플랫 디자인 */}
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
                  {d === day && <div className={styles.weddingMarker}>💍</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 카운트다운 */}
      {showCountdown && (
        <div style={{ marginTop: '48px' }}>
          <WeddingCountdown_4 targetDate={weddingDate} title={countdownTitle} />
        </div>
      )}
    </section>
  );
}
