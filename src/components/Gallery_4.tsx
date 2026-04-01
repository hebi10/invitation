'use client';

import GalleryDecoratedThemed from './GalleryDecoratedThemed';
import styles from './Gallery_4.module.css';

interface GalleryProps {
  images: string[];
}

export default function Gallery_4({ images }: GalleryProps) {
  return (
    <GalleryDecoratedThemed
      images={images}
      styles={styles}
      renderHeader={(themeStyles) => (
        <div className={themeStyles.header}>
          <div className={themeStyles.lemonDecoration}>◌</div>
          <h2 className={themeStyles.title}>Gallery</h2>
          <p className={themeStyles.subtitle}>함께한 순간을 천천히 다시 봅니다</p>
        </div>
      )}
      renderImageOverlay={(themeStyles) => (
        <div className={themeStyles.imageOverlay}>
          <span className={themeStyles.zoomIcon}>⌕</span>
        </div>
      )}
    />
  );
}
