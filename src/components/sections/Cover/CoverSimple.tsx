'use client';

import { HeartIconSimple } from '@/components/icons';
import CoverFramedThemed from './CoverFramedThemed';
import styles from './CoverSimple.module.css';

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

export default function CoverSimple(props: CoverProps) {
  return (
    <CoverFramedThemed
      {...props}
      styles={styles}
      renderNames={({ styles: themeStyles, groomName, brideName }) => (
        <h2 className={themeStyles.coupleNames}>
          {groomName}{' '}
          <span className={themeStyles.heart} aria-hidden="true">
            <HeartIconSimple className={themeStyles.heartImage} />
          </span>{' '}
          {brideName}
        </h2>
      )}
    />
  );
}
