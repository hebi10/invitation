'use client';

import WeddingCountdown_5 from './WeddingCountdown_5';
import WeddingCalendarThemed, { type WeddingCalendarSimpleProps } from './WeddingCalendarThemed';
import styles from './WeddingCalendar_5.module.css';

export default function WeddingCalendar_5(props: WeddingCalendarSimpleProps) {
  return (
    <WeddingCalendarThemed
      {...props}
      styles={styles}
      title="良辰"
      subtitle="Wedding Calendar"
      decoration="ornament"
      renderCountdown={(weddingDate, countdownTitle) => (
        <WeddingCountdown_5 targetDate={weddingDate} title={countdownTitle} />
      )}
    />
  );
}
