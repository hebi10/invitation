'use client';

import styles from './WeddingCountdown.module.css';

import WeddingCountdownDisplay from './WeddingCountdownDisplay';

interface WeddingCountdownProps {
  targetDate: Date;
  title?: string;
  showIcon?: boolean;
}

export default function WeddingCountdown(props: WeddingCountdownProps) {
  return (
    <WeddingCountdownDisplay
      {...props}
      styles={styles}
      separator="•"
      expiredTitle="축하합니다"
      expiredSubtitle="행복한 결혼식이 이미 시작되었습니다."
      icon="✦"
    />
  );
}
