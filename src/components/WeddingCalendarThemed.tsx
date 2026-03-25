'use client';

import type { ReactNode } from 'react';

export interface WeddingCalendarSimpleProps {
  weddingDate: Date;
  showCountdown?: boolean;
  countdownTitle?: string;
}

interface WeddingCalendarThemedProps extends WeddingCalendarSimpleProps {
  styles: Record<string, string>;
  title: string;
  subtitle: string;
  decoration: 'lemon' | 'ornament';
  renderCountdown?: (weddingDate: Date, countdownTitle: string) => ReactNode;
}

export default function WeddingCalendarThemed({
  weddingDate,
  showCountdown = false,
  countdownTitle = '결혼식까지',
  styles,
  title,
  subtitle,
  decoration,
  renderCountdown,
}: WeddingCalendarThemedProps) {
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const day = weddingDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = new Array(firstDay).fill(null);

  for (let currentDay = 1; currentDay <= daysInMonth; currentDay += 1) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(currentDay);
  }

  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push(null);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section className={styles.container}>
      {decoration === 'lemon' && 'lemonDecoration' in styles && <div className={styles.lemonDecoration}>🍋</div>}
      {decoration === 'ornament' && 'topDecoration' in styles && (
        <svg className={styles.topDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      )}

      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          {year}년 {monthNames[month]}
        </div>

        <div className={styles.weekHeader}>
          {dayNames.map((dayName, index) => (
            <div
              key={dayName}
              className={`${styles.dayName} ${index === 0 ? styles.sunday : ''} ${index === 6 ? styles.saturday : ''}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className={styles.calendarBody}>
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className={styles.week}>
              {week.map((currentDay, dayIndex) => (
                <div
                  key={`day-${weekIndex}-${dayIndex}`}
                  className={`${styles.day} ${currentDay === day ? styles.weddingDay : ''} ${
                    dayIndex === 0 && currentDay ? styles.sunday : ''
                  } ${dayIndex === 6 && currentDay ? styles.saturday : ''} ${!currentDay ? styles.empty : ''}`}
                >
                  {currentDay || ''}
                  {currentDay === day && <div className={styles.weddingMarker}>♥</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {showCountdown && renderCountdown && <div style={{ marginTop: '48px' }}>{renderCountdown(weddingDate, countdownTitle)}</div>}

      {decoration === 'ornament' && 'bottomDecoration' in styles && (
        <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      )}
    </section>
  );
}
