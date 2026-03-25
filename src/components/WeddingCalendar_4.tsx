'use client';

import WeddingCountdown_4 from './WeddingCountdown_4';
import WeddingCalendarThemed, { type WeddingCalendarSimpleProps } from './WeddingCalendarThemed';
import styles from './WeddingCalendar_4.module.css';

export default function WeddingCalendar_4(props: WeddingCalendarSimpleProps) {
  return (
    <WeddingCalendarThemed
      {...props}
      styles={styles}
      title="Wedding Day"
      subtitle="우리의 달력"
      decoration="lemon"
      renderCountdown={(weddingDate, countdownTitle) => (
        <WeddingCountdown_4 targetDate={weddingDate} title={countdownTitle} />
      )}
    />
  );
}
