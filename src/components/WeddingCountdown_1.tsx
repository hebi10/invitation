'use client';

import styles from './WeddingCountdown_1.module.css';

import WeddingCountdownDisplay from './WeddingCountdownDisplay';

interface WeddingCountdownProps {
  targetDate: Date;
  title?: string;
  showIcon?: boolean;
}

export default function WeddingCountdown_1({ targetDate, title }: WeddingCountdownProps) {
  return (
    <WeddingCountdownDisplay
      targetDate={targetDate}
      title={title}
      showIcon={false}
      styles={styles}
      separator=":"
      expiredTitle="축하합니다"
      expiredSubtitle="행복한 결혼식이 이미 시작되었습니다."
    />
  );
}
