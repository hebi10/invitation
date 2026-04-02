'use client';

import WeddingCountdown from './WeddingCountdown';
import WeddingCalendarInteractive, { type WeddingCalendarInteractiveProps } from '@/components/shared/WeddingCalendarInteractive';
import styles from './WeddingCalendar.module.css';

export default function WeddingCalendar(props: WeddingCalendarInteractiveProps) {
  return (
    <WeddingCalendarInteractive
      {...props}
      styles={styles}
      showWeddingInfo
      showWeddingIcon
      renderCountdown={(weddingDate, countdownTitle) => (
        <WeddingCountdown targetDate={weddingDate} title={countdownTitle} showIcon />
      )}
    />
  );
}
