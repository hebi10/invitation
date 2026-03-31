'use client';

import { useMemo } from 'react';
import styles from './WeddingCalendar_3.module.css';
import HeartIcon_1 from './HeartIcon_1';
import WeddingCountdown_3 from './WeddingCountdown_3';

interface WeddingCalendarProps {
  weddingDate: Date;
  showCountdown?: boolean;
  countdownTitle?: string;
}

export default function WeddingCalendar_3({
  weddingDate,
  showCountdown = false,
  countdownTitle = '결혼식까지',
}: WeddingCalendarProps) {
  const currentMonth = useMemo(() => new Date(weddingDate), [weddingDate]);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let index = firstDayOfWeek - 1; index >= 0; index -= 1) {
      currentWeek.push(null);
    }

    for (let date = 1; date <= lastDate; date += 1) {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return { year, month, weeks };
  }, [currentMonth]);

  const isWeddingDate = (date: number | null) =>
    Boolean(
      date &&
        date === weddingDate.getDate() &&
        calendarData.month === weddingDate.getMonth() &&
        calendarData.year === weddingDate.getFullYear()
    );

  const dDay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    return Math.ceil(
      (wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [weddingDate]);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section className={styles.container}>
      <div className={styles.cosmicBackground}></div>

      <div className={styles.header}>
        <div className={styles.starDecor}>✦</div>
        <h2 className={styles.title}>Wedding Day</h2>
        <div className={styles.starDecor}>✦</div>
      </div>

      {dDay >= 0 ? (
        <div className={styles.dDayBadge}>
          <div className={styles.dDayGlow}></div>
          <span className={styles.dDayText}>
            {dDay === 0 ? 'TODAY' : `D-${dDay}`}
          </span>
        </div>
      ) : null}

      <div className={styles.calendarWrapper}>
        <div className={styles.calendarCard}>
          <div className={styles.monthHeader}>
            <span className={styles.monthText}>
              {calendarData.year}년 {calendarData.month + 1}월
            </span>
          </div>

          <div className={styles.weekDays}>
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`${styles.weekDay} ${
                  index === 0 ? styles.sunday : index === 6 ? styles.saturday : ''
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className={styles.datesGrid}>
            {calendarData.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={styles.week}>
                {week.map((date, dayIndex) => {
                  const isWedding = date !== null && isWeddingDate(date);
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`${styles.dateCell} ${
                        date === null ? styles.empty : ''
                      } ${isWedding ? styles.weddingDate : ''} ${
                        dayIndex === 0 ? styles.sunday : dayIndex === 6 ? styles.saturday : ''
                      }`}
                    >
                      {date !== null ? (
                        <>
                          <span className={styles.dateNumber}>{date}</span>
                          {isWedding ? (
                            <>
                              <div className={styles.weddingMark} aria-hidden="true">
                                <HeartIcon_1 className={styles.weddingMarkIcon} />
                              </div>
                              <div className={styles.weddingGlow}></div>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.dateText}>
        <p className={styles.dateDisplay}>
          {weddingDate.getFullYear()}년 {weddingDate.getMonth() + 1}월{' '}
          {weddingDate.getDate()}일 {weekDays[weddingDate.getDay()]}요일
        </p>
      </div>

      <div className={styles.decorations}>
        <div className={styles.shootingStar1}></div>
        <div className={styles.shootingStar2}></div>
      </div>

      {showCountdown ? (
        <div style={{ marginTop: '40px' }}>
          <WeddingCountdown_3 targetDate={weddingDate} title={countdownTitle} />
        </div>
      ) : null}
    </section>
  );
}
