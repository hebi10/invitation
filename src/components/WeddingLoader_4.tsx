'use client';

import WeddingLoaderProgress, { type WeddingLoaderProgressProps } from './WeddingLoaderProgress';
import styles from './WeddingLoader_4.module.css';

export default function WeddingLoader_4(props: WeddingLoaderProgressProps) {
  return (
    <WeddingLoaderProgress
      {...props}
      styles={styles}
      theme="blue"
      subtitle="Wedding Invitation"
      separatorText="&"
    />
  );
}
