'use client';

import ScheduleTabbedThemed, { type ScheduleProps } from '@/components/shared/ScheduleTabbedThemed';
import styles from './Schedule.module.css';

export default function Schedule(props: ScheduleProps) {
  return (
    <ScheduleTabbedThemed
      {...props}
      styles={styles}
      title="예식 안내"
      layout="stacked"
      detailStyle="simple"
    />
  );
}
