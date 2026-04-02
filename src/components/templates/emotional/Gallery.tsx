'use client';

import GalleryGridShared, { type GalleryGridSharedProps } from '@/components/shared/GalleryGridShared';
import styles from './Gallery.module.css';

type GalleryProps = Pick<GalleryGridSharedProps, 'images' | 'title'>;

export default function Gallery(props: GalleryProps) {
  return <GalleryGridShared {...props} styles={styles} showButtonIcons />;
}
