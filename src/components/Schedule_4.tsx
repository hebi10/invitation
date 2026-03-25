'use client';

import ScheduleTabbedThemed, { type ScheduleProps } from './ScheduleTabbedThemed';
import styles from './Schedule_4.module.css';

export default function Schedule_4(props: ScheduleProps) {
  return (
    <ScheduleTabbedThemed
      {...props}
      styles={styles}
      title="Wedding Info"
      subtitle="예식 안내"
      decoration="lemon"
      layout="split"
      detailStyle="framed"
      detailIcons={{
        ceremony: '💍',
        reception: '🍽',
      }}
    />
  );
}
