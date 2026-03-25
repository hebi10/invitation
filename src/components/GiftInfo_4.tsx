'use client';

import GiftInfoThemed, { type GiftInfoProps } from './GiftInfoThemed';
import styles from './GiftInfo_4.module.css';

export default function GiftInfo_4(props: GiftInfoProps) {
  return (
    <GiftInfoThemed
      {...props}
      styles={styles}
      title="Gift"
      subtitle="마음 전하실 곳"
      groomSectionTitle="Groom"
      brideSectionTitle="Bride"
      copyLabel="계좌 복사"
    />
  );
}
