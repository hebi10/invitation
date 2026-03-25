'use client';

import styles from './WeddingCountdown_5.module.css';

import WeddingCountdownCompact from './WeddingCountdownCompact';

interface CountdownProps {
  targetDate: Date;
  title?: string;
}

export default function WeddingCountdown_5({ targetDate, title }: CountdownProps) {
  return (
    <WeddingCountdownCompact
      targetDate={targetDate}
      title={title}
      styles={styles}
      labels={{
        days: '일',
        hours: '시간',
        minutes: '분',
        seconds: '초',
      }}
    />
  );
}
