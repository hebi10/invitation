'use client';

import GiftInfoThemed, { type GiftInfoProps } from '@/components/shared/GiftInfoThemed';
import styles from './GiftInfo.module.css';

export default function GiftInfo(props: GiftInfoProps) {
  return (
    <GiftInfoThemed
      {...props}
      styles={styles}
      title="마음 전하실 곳"
      groomSectionTitle="신랑측 계좌"
      brideSectionTitle="신부측 계좌"
      copyLabel="복사"
      wrapInCard
    />
  );
}
