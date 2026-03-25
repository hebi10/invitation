'use client';

import GiftInfoThemed, { type GiftInfoProps } from './GiftInfoThemed';
import styles from './GiftInfo_5.module.css';

export default function GiftInfo_5(props: GiftInfoProps) {
  return (
    <GiftInfoThemed
      {...props}
      styles={styles}
      title="禮金"
      subtitle="Account Information"
      groomSectionTitle="신랑측"
      brideSectionTitle="신부측"
      copyLabel="복사"
      showTopDecoration
      showBottomDecoration
    />
  );
}
