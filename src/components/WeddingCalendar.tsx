'use client';

import React, { useState } from 'react';
import styles from './WeddingCalendar.module.css';
import WeddingCountdown from './WeddingCountdown';

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
  showCountdown?: boolean;
  countdownTitle?: string;
}

export default function WeddingCalendar({
  title = "결혼식 달력",
  weddingDate,
  currentMonth = new Date(),
  events = [],
  onDateClick,
  showCountdown = false,
  countdownTitle = "결혼식까지"
}: WeddingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(weddingDate || null);
  const [displayMonth, setDisplayMonth] = useState(currentMonth);

  const handleDateClick = (date: Date) => {
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

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className={styles.emptyDay}></div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
      const isWeddingDay = weddingDate && 
        currentDate.toDateString() === weddingDate.toDateString();
      const isSelected = selectedDate && 
        currentDate.toDateString() === selectedDate.toDateString();
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const isClickable = isWeddingDay;

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
        <h2 className={styles.title}>{title}</h2>
      </div>
      
      <div className={styles.calendarWrapper}>
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

        <div className={styles.weekdaysHeader}>
          {weekdays.map(day => (
            <div key={day} className={styles.weekday}>
              {day}
            </div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {renderCalendarDays()}
        </div>
      </div>
      
      {showCountdown && weddingDate ? (
        <WeddingCountdown 
          targetDate={weddingDate} 
          title={countdownTitle}
          showIcon={true}
        />
      ) : null}
      
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
