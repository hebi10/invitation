'use client';

import { HeartIconSimple } from '@/components/icons';
import WeddingLoaderMessage, {
  type WeddingLoaderMessageBaseProps,
} from './WeddingLoaderMessage';
import styles from './WeddingLoader.module.css';

const loadingMessages = [
  '소중한 초대를 준비하고 있어요...',
  '모바일 청첩장을 여는 중이에요...',
  '두 분의 특별한 순간을 불러오고 있어요...',
  '곧 청첩장이 열립니다.',
];

export default function WeddingLoader(props: WeddingLoaderMessageBaseProps) {
  return (
    <WeddingLoaderMessage
      {...props}
      styles={styles}
      loadingMessages={loadingMessages}
      minLoadTime={1500}
      messageClassName={styles.loadingText}
      renderHero={(themeStyles) => (
        <div className={themeStyles.heartContainer}>
          <div className={themeStyles.heart}>
            <HeartIconSimple className={themeStyles.heartImage} priority />
          </div>
          <div className={themeStyles.sparkles}>
            <div className={themeStyles.sparkle}></div>
            <div className={themeStyles.sparkle}></div>
            <div className={themeStyles.sparkle}></div>
            <div className={themeStyles.sparkle}></div>
            <div className={themeStyles.sparkle}></div>
            <div className={themeStyles.sparkle}></div>
          </div>
        </div>
      )}
      renderHeading={({ styles: themeStyles, groomName, brideName }) => (
        <h1 className={themeStyles.loadingText}>
          {groomName} &amp; {brideName}
        </h1>
      )}
      renderSubtitle={(themeStyles) => (
        <p className={themeStyles.loadingText}>
          두 사람의 특별한 순간에
          <br />
          여러분을 초대합니다
        </p>
      )}
    />
  );
}
