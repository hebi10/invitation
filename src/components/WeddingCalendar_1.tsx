'use client';

import WeddingCountdown_1 from './WeddingCountdown_1';
import WeddingCalendarInteractive, { type WeddingCalendarInteractiveProps } from './WeddingCalendarInteractive';
import styles from './WeddingCalendar_1.module.css';

export default function WeddingCalendar_1(props: WeddingCalendarInteractiveProps) {
  return (
    <WeddingCalendarInteractive
      {...props}
      styles={styles}
      wrapInCard
      renderCountdown={(weddingDate, countdownTitle) => (
        <WeddingCountdown_1 targetDate={weddingDate} title={countdownTitle} showIcon />
      )}
    />
  );
}
