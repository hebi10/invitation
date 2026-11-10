'use client';

import { useId } from 'react';

import { buildWeddingCalendar, type WeddingCalendarEvent } from '@/lib/weddingCalendar';
import styles from './WeddingCalendarDownload.module.css';

export default function WeddingCalendarDownload(props: WeddingCalendarEvent) {
  const hintId = useId();
  if (!Number.isFinite(props.eventDate.getTime())) return null;

  const downloadCalendar = () => {
    const calendar = buildWeddingCalendar(props);
    if (!calendar) return;
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Allow the browser to consume the file before releasing its object URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button type="button" className={styles.button} onClick={downloadCalendar} aria-label="캘린더에 저장" aria-describedby={hintId}>
      <span className={styles.buttonTitle}>캘린더에 저장</span>
      <span className={styles.buttonHint} id={hintId}>일정 파일(.ics) 다운로드</span>
    </button>
  );
}
