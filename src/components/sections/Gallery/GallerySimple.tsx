'use client';

import GalleryGridShared, { type GalleryGridSharedProps } from './GalleryGridShared';
import styles from './GallerySimple.module.css';

type GalleryProps = Pick<GalleryGridSharedProps, 'images' | 'imagesLoading' | 'title'>;

export default function GallerySimple(props: GalleryProps) {
  return <GalleryGridShared {...props} styles={styles} />;
}
