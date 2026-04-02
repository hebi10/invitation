'use client';

import GiftInfoThemed, { type GiftInfoProps } from './GiftInfoThemed';
import styles from './GiftInfoSimple.module.css';

export default function GiftInfoSimple(props: GiftInfoProps) {
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
