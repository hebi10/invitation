'use client';

import React, { useState } from 'react';
import styles from './WeddingCalendar.module.css';

interface CalendarEvent {
  date: number;
  type: 'wedding' | 'event' | 'special';
  title?: string;
  description?: string;
}

interface WeddingCalendarProps {
  title?: string;
  weddingDate?: Date;
  currentMonth?: Date;
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
}

export default function WeddingCalendar({
  title = "결혼식 달력",
  weddingDate,
  currentMonth = new Date(),
  events = [],
  onDateClick
}: WeddingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(weddingDate || null);
  const [displayMonth, setDisplayMonth] = useState(currentMonth);

  const handleDateClick = (date: Date) => {
    // 결혼식 날짜만 클릭 가능하도록 제한
    if (weddingDate && date.toDateString() === weddingDate.toDateString()) {
      setSelectedDate(date);
      if (onDateClick) {
        onDateClick(date);
      }
    }
  };

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(displayMonth);
    const firstDay = getFirstDayOfMonth(displayMonth);
    const days = [];

    // 이전 달의 빈 칸들
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className={styles.emptyDay}></div>
      );
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
      const isWeddingDay = weddingDate && 
        currentDate.toDateString() === weddingDate.toDateString();
      const isSelected = selectedDate && 
        currentDate.toDateString() === selectedDate.toDateString();
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const isClickable = isWeddingDay; // 결혼식 날짜만 클릭 가능

      // 해당 날짜의 이벤트 찾기
      const dayEvents = events.filter(event => event.date === day);

      days.push(
        <div
          key={day}
          className={`${styles.dayCell} ${isWeddingDay ? styles.weddingDay : ''} ${
            isSelected ? styles.selectedDay : ''
          } ${isToday ? styles.today : ''} ${!isClickable ? styles.nonClickable : ''}`}
          onClick={() => isClickable && handleDateClick(currentDate)}
          style={{ cursor: isClickable ? 'pointer' : 'default' }}
        >
          <span className={styles.dayNumber}>{day}</span>
          {dayEvents.length > 0 && (
            <div className={styles.eventIndicators}>
              {dayEvents.map((event, index) => (
                <div 
                  key={index}
                  className={`${styles.eventDot} ${styles[event.type]}`}
                  title={event.title || event.description}
                />
              ))}
            </div>
          )}
          {isWeddingDay && (
            <div className={styles.weddingIcon}>💒</div>
          )}
        </div>
      );
    }

    return days;
  };

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.titleIcon}>💝</span>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.titleIcon}>💝</span>
      </div>
      
      <div className={styles.calendarWrapper}>
        {/* 달력 헤더 - 월 표시만 (네비게이션 제거) */}
        <div className={styles.monthHeader}>
          <div className={styles.monthTitleContainer}>
            <h4 className={styles.monthTitle}>
              {displayMonth.getFullYear()}년 {monthNames[displayMonth.getMonth()]}
            </h4>
            <div className={styles.monthSubtitle}>
              {weddingDate && `${weddingDate.getDate()}일 결혼식`}
            </div>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className={styles.weekdaysHeader}>
          {weekdays.map(day => (
            <div key={day} className={styles.weekday}>
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className={styles.calendarGrid}>
          {renderCalendarDays()}
        </div>
      </div>
      
      {selectedDate && (
        <div className={styles.selectedDate}>
          <span className={styles.selectedIcon}>✨</span>
          <span className={styles.selectedText}>
            선택된 날짜: {selectedDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      )}
      
      {weddingDate && (
        <div className={styles.weddingInfo}>
          <span className={styles.weddingIcon}>💒</span>
          <span className={styles.weddingText}>
            결혼식 날짜: {weddingDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      )}
    </div>
  );
}
