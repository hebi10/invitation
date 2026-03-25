'use client';

import styles from './WeddingCountdown_4.module.css';

import WeddingCountdownCompact from './WeddingCountdownCompact';

interface CountdownProps {
  targetDate: Date;
  title?: string;
}

export default function WeddingCountdown_4({ targetDate, title }: CountdownProps) {
  return (
    <WeddingCountdownCompact
      targetDate={targetDate}
      title={title}
      styles={styles}
      labels={{
        days: 'Days',
        hours: 'Hours',
        minutes: 'Minutes',
        seconds: 'Seconds',
      }}
    />
  );
}
