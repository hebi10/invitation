'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './Gallery_5.module.css';

interface GalleryProps {
  images: string[];
}

export default function Gallery_5({ images }: GalleryProps) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const displayImages = images.slice(0, visibleCount);
  const hasMore = visibleCount < images.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedImage !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  const handlePrevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length);
    }
  };

  const handleNextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedImage(null);
    } else if (e.key === 'ArrowLeft') {
      handlePrevImage();
    } else if (e.key === 'ArrowRight') {
      handleNextImage();
    }
  };

  const modalContent = selectedImage !== null && mounted && (
    <div
      className={styles.modal}
      onClick={() => setSelectedImage(null)}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <button
        className={styles.closeButton}
        onClick={() => setSelectedImage(null)}
      >
        ✕
      </button>

      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalImageWrapper}>
          <Image
            src={images[selectedImage]}
            alt={`갤러리 이미지 ${selectedImage + 1}`}
            fill
            sizes="100vw"
            quality={85}
            priority
            className={styles.modalImage}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>

      <button
        className={`${styles.navButton} ${styles.prevButton}`}
        onClick={(e) => {
          e.stopPropagation();
          handlePrevImage();
        }}
      >
        ‹
      </button>

      <button
        className={`${styles.navButton} ${styles.nextButton}`}
        onClick={(e) => {
          e.stopPropagation();
          handleNextImage();
        }}
      >
        ›
      </button>

      <div className={styles.imageCounter}>
        {selectedImage + 1} / {images.length}
      </div>
    </div>
  );

  return (
    <section className={styles.gallery}>
      <div className={styles.container}>
        {/* 금박 장식 */}
        <svg className={styles.topDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>

        <h2 className={styles.title}>寫眞</h2>
        <p className={styles.subtitle}>Gallery</p>

        <div className={styles.grid}>
          {displayImages.map((image, index) => (
            <div
              key={index}
              className={styles.imageItem}
              onClick={() => setSelectedImage(index)}
            >
              <Image
                src={image}
                alt={`Wedding photo ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                quality={75}
                className={styles.image}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            className={styles.loadMoreButton}
            onClick={() => setVisibleCount(prev => Math.min(prev + 6, images.length))}
          >
            더 보기 ({images.length - visibleCount}장 남음)
          </button>
        )}

        <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      </div>

      {mounted && createPortal(modalContent, document.body)}
    </section>
  );
}
