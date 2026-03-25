'use client';

import GalleryGridShared, { type GalleryGridSharedProps } from './GalleryGridShared';
import styles from './Gallery_1.module.css';

type GalleryProps = Pick<GalleryGridSharedProps, 'images' | 'title'>;

export default function Gallery_1(props: GalleryProps) {
  return <GalleryGridShared {...props} styles={styles} preloadAllImages />;
}
