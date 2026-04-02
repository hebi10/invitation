'use client';

import WeddingCountdownSimple from '@/components/sections/WeddingCountdown/WeddingCountdownSimple';
import WeddingCalendarInteractive, { type WeddingCalendarInteractiveProps } from './WeddingCalendarInteractive';
import styles from './WeddingCalendarSimple.module.css';

export default function WeddingCalendarSimple(props: WeddingCalendarInteractiveProps) {
  return (
    <WeddingCalendarInteractive
      {...props}
      styles={styles}
      wrapInCard
      renderCountdown={(weddingDate, countdownTitle) => (
        <WeddingCountdownSimple targetDate={weddingDate} title={countdownTitle} showIcon />
      )}
    />
  );
}
