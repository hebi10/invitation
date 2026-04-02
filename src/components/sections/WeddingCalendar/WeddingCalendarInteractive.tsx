'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { HeartIcon } from '@/components/icons';

interface CalendarEvent {
  date: number;
  type: 'wedding' | 'event' | 'special';
  title?: string;
  description?: string;
}

export interface WeddingCalendarInteractiveProps {
  title?: string;
  weddingDate?: Date;
  currentMonth?: Date;
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  showCountdown?: boolean;
  countdownTitle?: string;
}

interface SharedWeddingCalendarInteractiveProps extends WeddingCalendarInteractiveProps {
  styles: Record<string, string>;
  wrapInCard?: boolean;
  showWeddingInfo?: boolean;
  showWeddingIcon?: boolean;
  renderCountdown?: (weddingDate: Date, countdownTitle: string) => ReactNode;
}

export default function WeddingCalendarInteractive({
  title = '결혼식 달력',
  weddingDate,
  currentMonth = new Date(),
  events = [],
  onDateClick,
  showCountdown = false,
  countdownTitle = '결혼식까지',
  styles,
  wrapInCard = false,
  showWeddingInfo = false,
  showWeddingIcon = false,
  renderCountdown,
}: SharedWeddingCalendarInteractiveProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(weddingDate || null);

  useEffect(() => {
    setSelectedDate(weddingDate || null);
  }, [weddingDate]);

  const displayMonth = currentMonth;

  const handleDateClick = (date: Date) => {
    if (!weddingDate || date.toDateString() !== weddingDate.toDateString()) {
      return;
    }

    setSelectedDate(date);
    onDateClick?.(date);
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(displayMonth);
    const firstDay = getFirstDayOfMonth(displayMonth);
    const days: ReactNode[] = [];

    for (let i = 0; i < firstDay; i += 1) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const currentDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
      const isWeddingDay = Boolean(weddingDate && currentDate.toDateString() === weddingDate.toDateString());
      const isSelected = Boolean(selectedDate && currentDate.toDateString() === selectedDate.toDateString());
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const dayEvents = events.filter((event) => event.date === day);

      days.push(
        <div
          key={day}
          className={`${styles.dayCell} ${isWeddingDay ? styles.weddingDay : ''} ${
            isSelected ? styles.selectedDay : ''
          } ${isToday ? styles.today : ''} ${!isWeddingDay ? styles.nonClickable : ''}`}
          onClick={() => handleDateClick(currentDate)}
          style={{ cursor: isWeddingDay ? 'pointer' : 'default' }}
        >
          <span className={styles.dayNumber}>{day}</span>
          {dayEvents.length > 0 && (
            <div className={styles.eventIndicators}>
              {dayEvents.map((event, index) => (
                <div
                  key={`${event.type}-${index}`}
                  className={`${styles.eventDot} ${styles[event.type] || ''}`}
                  title={event.title || event.description}
                />
              ))}
            </div>
          )}
          {isWeddingDay && showWeddingIcon && 'weddingIcon' in styles && (
            <div className={styles.weddingIcon}>
              <HeartIcon className={'weddingIconImage' in styles ? styles.weddingIconImage : undefined} />
            </div>
          )}
        </div>,
      );
    }

    return days;
  };

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  const content = (
    <>
      {'header' in styles ? (
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </div>
      ) : (
        <h2 className={styles.title}>{title}</h2>
      )}

      <div className={styles.calendarWrapper}>
        <div className={styles.monthHeader}>
          {'monthTitleContainer' in styles ? (
            <div className={styles.monthTitleContainer}>
              <h4 className={styles.monthTitle}>
                {displayMonth.getFullYear()}년 {monthNames[displayMonth.getMonth()]}
              </h4>
              {weddingDate && 'monthSubtitle' in styles && (
                <div className={styles.monthSubtitle}>{weddingDate.getDate()}일 결혼식</div>
              )}
            </div>
          ) : (
            <>
              <h4 className={styles.monthTitle}>
                {displayMonth.getFullYear()}년 {monthNames[displayMonth.getMonth()]}
              </h4>
              {weddingDate && 'monthSubtitle' in styles && (
                <div className={styles.monthSubtitle}>{weddingDate.getDate()}일 결혼식</div>
              )}
            </>
          )}
        </div>

        <div className={styles.weekdaysHeader}>
          {weekdays.map((day) => (
            <div key={day} className={styles.weekday}>
              {day}
            </div>
          ))}
        </div>

        <div className={styles.calendarGrid}>{renderCalendarDays()}</div>
      </div>

      {showCountdown && weddingDate && renderCountdown?.(weddingDate, countdownTitle)}

      {showWeddingInfo && weddingDate && 'weddingInfo' in styles && 'weddingText' in styles && 'weddingIcon' in styles && (
        <div className={styles.weddingInfo}>
          <span className={styles.weddingIcon}>
            <HeartIcon className={'weddingIconImage' in styles ? styles.weddingIconImage : undefined} />
          </span>
          <span className={styles.weddingText}>
            결혼식 날짜:{' '}
            {weddingDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      )}
    </>
  );

  return <div className={styles.container}>{wrapInCard && 'card' in styles ? <div className={styles.card}>{content}</div> : content}</div>;
}
