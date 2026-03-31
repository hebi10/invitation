'use client';

import { useEffect, useState } from 'react';
import styles from './WeddingCalendar_2.module.css';
import WeddingCountdown_2 from './WeddingCountdown_2';

interface WeddingCalendarProps {
  weddingDate: Date;
  showCountdown?: boolean;
  countdownTitle?: string;
}

export default function WeddingCalendar_2({
  weddingDate,
  showCountdown = false,
  countdownTitle = '결혼식까지',
}: WeddingCalendarProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const day = weddingDate.getDate();
  const monthNames = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = new Array(firstDay).fill(null);

  for (let date = 1; date <= daysInMonth; date += 1) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(date);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Wedding Day</h2>

      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          {year}년 {monthNames[month]}
        </div>

        <div className={styles.weekHeader}>
          {dayNames.map((dayName, index) => (
            <div
              key={dayName}
              className={`${styles.dayName} ${
                index === 0 ? styles.sunday : ''
              } ${index === 6 ? styles.saturday : ''}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className={styles.calendarBody}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className={styles.week}>
              {week.map((date, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`${styles.day} ${
                    date === day ? styles.weddingDay : ''
                  } ${dayIndex === 0 && date ? styles.sunday : ''} ${
                    dayIndex === 6 && date ? styles.saturday : ''
                  } ${!date ? styles.empty : ''}`}
                >
                  {date || ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {showCountdown && isClient ? (
        <div style={{ marginTop: '40px' }}>
          <WeddingCountdown_2 targetDate={weddingDate} title={countdownTitle} />
        </div>
      ) : null}
    </section>
  );
}
