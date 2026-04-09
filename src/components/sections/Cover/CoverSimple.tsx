'use client';

import Image from 'next/image';

import { HeartIconSimple } from '@/components/icons';
import mainTitleImage from '../../../../public/images/main_title02.png';
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
      renderTitle={({ styles: themeStyles, title }) => (
        <h1 className={themeStyles.title}>
          <span className={themeStyles.visuallyHidden}>{title || 'Invitation'}</span>
          <Image
            src={mainTitleImage}
            alt=""
            priority
            className={themeStyles.titleImage}
          />
        </h1>
      )}
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
