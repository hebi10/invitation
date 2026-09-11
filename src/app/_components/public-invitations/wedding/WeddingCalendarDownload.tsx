'use client';

import { buildWeddingCalendar, type WeddingCalendarEvent } from '@/lib/weddingCalendar';
import styles from './WeddingCalendarDownload.module.css';

export default function WeddingCalendarDownload(props: WeddingCalendarEvent) {
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
    <button type="button" className={styles.button} onClick={downloadCalendar}>
      캘린더에 저장
    </button>
  );
}
