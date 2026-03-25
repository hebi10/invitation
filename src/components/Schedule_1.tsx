'use client';

import ScheduleTabbedThemed, { type ScheduleProps } from './ScheduleTabbedThemed';
import styles from './Schedule_1.module.css';

export default function Schedule_1(props: ScheduleProps) {
  return (
    <ScheduleTabbedThemed
      {...props}
      styles={styles}
      title="예식 안내"
      wrapInCard
      layout="split"
      detailStyle="framed"
      detailIcons={{
        ceremony: '•',
        reception: '•',
      }}
    />
  );
}
