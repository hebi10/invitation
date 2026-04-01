'use client';

import CoverFramedThemed from './CoverFramedThemed';
import styles from './Cover_5.module.css';

interface CoverProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  ceremonyTime?: string;
  venueName?: string;
  primaryActionTargetId?: string;
  backgroundImage?: string;
  preloadComplete?: boolean;
}

export default function Cover_5(props: CoverProps) {
  return (
    <CoverFramedThemed
      {...props}
      styles={styles}
      beforeContent={
        <svg className={styles.topDecoration} viewBox="0 0 200 20" preserveAspectRatio="none">
          <path
            d="M 0 10 Q 50 0, 100 10 T 200 10"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <path
            d="M 0 15 Q 50 8, 100 15 T 200 15"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.8"
            opacity="0.6"
          />
        </svg>
      }
      afterContent={
        <svg
          className={styles.bottomDecoration}
          viewBox="0 0 200 20"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 10 Q 50 20, 100 10 T 200 10"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <path
            d="M 0 5 Q 50 12, 100 5 T 200 5"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.8"
            opacity="0.6"
          />
        </svg>
      }
      renderNames={({ styles: themeStyles, groomName, brideName }) => (
        <div className={themeStyles.names}>
          <span className={themeStyles.groomName}>{groomName}</span>
          <span className={themeStyles.divider}>·</span>
          <span className={themeStyles.brideName}>{brideName}</span>
        </div>
      )}
    />
  );
}
