'use client';

import styles from './Gallery.module.css';

interface GalleryProps {
  images: string[];
  title?: string;
}

export default function Gallery({ images, title = "Gallery" }: GalleryProps) {
  return (
    <section className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.imageGrid}>
        {images.map((image, index) => (
          <img 
            key={index} 
            className={styles.imageItem}
            src={image} 
            alt={`Gallery image ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
