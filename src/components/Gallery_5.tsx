'use client';

import GalleryDecoratedThemed from './GalleryDecoratedThemed';
import styles from './Gallery_5.module.css';

interface GalleryProps {
  images: string[];
}

export default function Gallery_5({ images }: GalleryProps) {
  return (
    <GalleryDecoratedThemed
      images={images}
      styles={styles}
      renderHeader={(themeStyles) => (
        <>
          <svg className={themeStyles.topDecoration} viewBox="0 0 100 10">
            <path
              d="M 0 5 Q 25 2, 50 5 T 100 5"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1"
            />
          </svg>
          <h2 className={themeStyles.title}>記錄</h2>
          <p className={themeStyles.subtitle}>Gallery</p>
        </>
      )}
      renderFooter={(themeStyles) => (
        <svg className={themeStyles.bottomDecoration} viewBox="0 0 100 10">
          <path
            d="M 0 5 Q 25 8, 50 5 T 100 5"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
          />
        </svg>
      )}
    />
  );
}
