'use client';

import ScheduleTabbedThemed, { type ScheduleProps } from './ScheduleTabbedThemed';
import styles from './ScheduleSimple.module.css';

export default function ScheduleSimple(props: ScheduleProps) {
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
