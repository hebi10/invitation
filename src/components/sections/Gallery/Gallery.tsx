'use client';

import GalleryGridShared, { type GalleryGridSharedProps } from './GalleryGridShared';
import styles from './Gallery.module.css';

type GalleryProps = Pick<GalleryGridSharedProps, 'images' | 'imagesLoading' | 'title'>;

export default function Gallery(props: GalleryProps) {
  return <GalleryGridShared {...props} styles={styles} showButtonIcons />;
}
