'use client';

import GreetingExpandableThemed from './GreetingExpandableThemed';
import styles from './Greeting_4.module.css';

interface GreetingProps {
  message: string;
  author: string;
  groom?: import('@/config/weddingPages').PersonInfo;
  bride?: import('@/config/weddingPages').PersonInfo;
}

export default function Greeting_4(props: GreetingProps) {
  return (
    <GreetingExpandableThemed
      {...props}
      styles={styles}
      title="Invitation"
      groomLabel="Groom"
      brideLabel="Bride"
      contactButtonLabel="📞 연락하기"
      phoneButtonLabel="📞"
      topDecoration={
        <div className={styles.topDecoration} aria-hidden="true">
          <span className={styles.lemon}>🍋</span>
        </div>
      }
      middleDecoration={
        <div className={styles.waveDivider} aria-hidden="true">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,30 Q300,10 600,30 T1200,30 L1200,60 L0,60 Z" />
          </svg>
        </div>
      }
      formatAuthor={(author) => `— ${author}`}
    />
  );
}
