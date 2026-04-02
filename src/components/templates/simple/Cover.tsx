'use client';

import HeartIcon_1 from '@/components/HeartIcon_1';
import CoverFramedThemed from '@/components/shared/CoverFramedThemed';
import styles from './Cover.module.css';

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

export default function Cover(props: CoverProps) {
  return (
    <CoverFramedThemed
      {...props}
      styles={styles}
      renderNames={({ styles: themeStyles, groomName, brideName }) => (
        <h2 className={themeStyles.coupleNames}>
          {groomName}{' '}
          <span className={themeStyles.heart} aria-hidden="true">
            <HeartIcon_1 className={themeStyles.heartImage} />
          </span>{' '}
          {brideName}
        </h2>
      )}
    />
  );
}
