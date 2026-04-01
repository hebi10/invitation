'use client';

import WeddingLoaderMessage, {
  type WeddingLoaderMessageBaseProps,
} from './WeddingLoaderMessage';
import styles from './WeddingLoader_1.module.css';

const loadingMessages = [
  '페이지를 차분히 준비하고 있어요...',
  '대표 사진을 먼저 불러오고 있어요...',
  '조금만 기다리면 바로 열립니다...',
  '곧 초대장을 보여드릴게요.',
];

export default function WeddingLoader_1(props: WeddingLoaderMessageBaseProps) {
  return (
    <WeddingLoaderMessage
      {...props}
      styles={styles}
      loadingMessages={loadingMessages}
      minLoadTime={1800}
      messageClassName={styles.loadingMessage}
      renderHero={(themeStyles) => (
        <div className={themeStyles.logoContainer}>
          <div className={themeStyles.logo}>
            <div className={themeStyles.circle}></div>
            <div className={themeStyles.dot}></div>
          </div>
        </div>
      )}
      renderHeading={({ styles: themeStyles, groomName, brideName }) => (
        <h1 className={themeStyles.coupleNames}>
          {groomName} &amp; {brideName}
        </h1>
      )}
      renderSubtitle={(themeStyles) => (
        <p className={themeStyles.subtitle}>Wedding Invitation</p>
      )}
    />
  );
}
