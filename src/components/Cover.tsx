'use client';

import styles from './Cover.module.css';

interface CoverProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
}

export default function Cover({ 
  title, 
  subtitle, 
  imageUrl, 
  brideName, 
  groomName, 
  weddingDate 
}: CoverProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <img className={styles.image} src={imageUrl} alt="Wedding couple" />
      <h2 className={styles.coupleNames}>{groomName} ♥ {brideName}</h2>
      <p className={styles.weddingDate}>{weddingDate}</p>
    </div>
  );
}
