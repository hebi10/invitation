'use client';

import GalleryGridShared, { type GalleryGridSharedProps } from './GalleryGridShared';
import styles from './GallerySimple.module.css';

type GalleryProps = Pick<
  GalleryGridSharedProps,
  'images' | 'previewImages' | 'imagesLoading' | 'title'
>;

export default function GallerySimple(props: GalleryProps) {
  return <GalleryGridShared {...props} styles={styles} />;
}
