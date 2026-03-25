'use client';

import WeddingLoaderProgress, { type WeddingLoaderProgressProps } from './WeddingLoaderProgress';
import styles from './WeddingLoader_5.module.css';

export default function WeddingLoader_5(props: WeddingLoaderProgressProps) {
  return (
    <WeddingLoaderProgress
      {...props}
      styles={styles}
      theme="classic"
      subtitle="청첩장"
      separatorText="·"
    />
  );
}
