'use client';

import GreetingExpandableThemed from './GreetingExpandableThemed';
import styles from './Greeting_5.module.css';

interface GreetingProps {
  message: string;
  author: string;
  groom?: import('@/config/weddingPages').PersonInfo;
  bride?: import('@/config/weddingPages').PersonInfo;
}

export default function Greeting_5(props: GreetingProps) {
  return (
    <GreetingExpandableThemed
      {...props}
      styles={styles}
      title="初請狀"
      subtitle="인사말"
      groomLabel="新郞"
      brideLabel="新婦"
      contactButtonLabel="聯絡"
      phoneButtonLabel="☎"
      topDecoration={
        <svg className={styles.topDecoration} viewBox="0 0 100 10" preserveAspectRatio="none">
          <path
            d="M 0 5 Q 25 2, 50 5 T 100 5"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
          />
        </svg>
      }
      bottomDecoration={
        <svg
          className={styles.bottomDecoration}
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 5 Q 25 8, 50 5 T 100 5"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
          />
        </svg>
      }
    />
  );
}
