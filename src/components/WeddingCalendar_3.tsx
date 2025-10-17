'use client';

import { useState, useMemo } from 'react';
import styles from './WeddingCalendar_3.module.css';

interface WeddingCalendarProps {
  weddingDate: Date;
}

export default function WeddingCalendar_3({ weddingDate }: WeddingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(weddingDate));

  // 달력 데이터 생성
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // 이전 달 날짜
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      currentWeek.push(null);
    }

    // 현재 달 날짜
    for (let date = 1; date <= lastDate; date++) {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 다음 달 날짜
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return { year, month, weeks };
  }, [currentMonth]);

  // 결혼식 날짜 체크
  const isWeddingDate = (date: number | null): boolean => {
    if (!date) return false;
    return (
      date === weddingDate.getDate() &&
      calendarData.month === weddingDate.getMonth() &&
      calendarData.year === weddingDate.getFullYear()
    );
  };

  // D-Day 계산
  const dDay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    const diff = Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [weddingDate]);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.cosmicBackground}></div>

      {/* 타이틀 */}
      <div className={styles.header}>
        <div className={styles.starDecor}>✦</div>
        <h2 className={styles.title}>Wedding Day</h2>
        <div className={styles.starDecor}>✦</div>
      </div>

      {/* D-Day 카운트 */}
      {dDay >= 0 && (
        <div className={styles.dDayBadge}>
          <div className={styles.dDayGlow}></div>
          <span className={styles.dDayText}>
            {dDay === 0 ? 'TODAY' : `D-${dDay}`}
          </span>
        </div>
      )}

      {/* 달력 */}
      <div className={styles.calendarWrapper}>
        <div className={styles.calendarCard}>
          {/* 월/년도 표시 */}
          <div className={styles.monthHeader}>
            <span className={styles.monthText}>
              {calendarData.year}년 {calendarData.month + 1}월
            </span>
          </div>

          {/* 요일 헤더 */}
          <div className={styles.weekDays}>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`${styles.weekDay} ${
                  index === 0 ? styles.sunday : index === 6 ? styles.saturday : ''
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className={styles.datesGrid}>
            {calendarData.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={styles.week}>
                {week.map((date, dayIndex) => {
                  const isWedding = date !== null && isWeddingDate(date);
                  return (
                    <div
                      key={dayIndex}
                      className={`${styles.dateCell} ${
                        date === null ? styles.empty : ''
                      } ${isWedding ? styles.weddingDate : ''} ${
                        dayIndex === 0 ? styles.sunday : dayIndex === 6 ? styles.saturday : ''
                      }`}
                    >
                      {date !== null && (
                        <>
                          <span className={styles.dateNumber}>{date}</span>
                          {isWedding && (
                            <>
                              <div className={styles.weddingMark}>♥</div>
                              <div className={styles.weddingGlow}></div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 결혼식 날짜 텍스트 */}
      <div className={styles.dateText}>
        <p className={styles.dateDisplay}>
          {weddingDate.getFullYear()}년 {weddingDate.getMonth() + 1}월 {weddingDate.getDate()}일{' '}
          {weekDays[weddingDate.getDay()]}요일
        </p>
      </div>

      {/* 우주 장식 요소 */}
      <div className={styles.decorations}>
        <div className={styles.shootingStar1}></div>
        <div className={styles.shootingStar2}></div>
      </div>
    </section>
  );
}
