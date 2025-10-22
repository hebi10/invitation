'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './Gallery_4.module.css';

interface GalleryProps {
  images: string[];
}

export default function Gallery_4({ images }: GalleryProps) {
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
        aria-label="닫기"
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
        aria-label="이전 이미지"
      >
        ‹
      </button>

      <button
        className={`${styles.navButton} ${styles.nextButton}`}
        onClick={(e) => {
          e.stopPropagation();
          handleNextImage();
        }}
        aria-label="다음 이미지"
      >
        ›
      </button>

      <div className={styles.imageCounter}>
        {selectedImage + 1} / {images.length}
      </div>
    </div>
  );

  return (
    <section className={styles.gallery} aria-label="갤러리">
      <div className={styles.container}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.lemonDecoration}>🍋</div>
          <h2 className={styles.title}>Gallery</h2>
          <p className={styles.subtitle}>소중한 순간들을 함께 나눕니다</p>
        </div>

        {/* 이미지 그리드 - 플랫 디자인 */}
        <div className={styles.grid}>
          {displayImages.map((image, index) => (
            <div
              key={index}
              className={styles.imageCard}
              onClick={() => setSelectedImage(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedImage(index);
                }
              }}
              aria-label={`갤러리 이미지 ${index + 1} 확대`}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={image}
                  alt={`갤러리 이미지 ${index + 1}`}
                  fill
                  sizes="(max-width: 700px) 50vw, 33vw"
                  quality={70}
                  className={styles.image}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className={styles.imageOverlay}>
                <span className={styles.zoomIcon}>🔍</span>
              </div>
            </div>
          ))}
        </div>

        {/* 더보기 버튼 */}
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              className={styles.loadMoreButton}
              onClick={() => setVisibleCount(prev => Math.min(prev + 6, images.length))}
              aria-label="이미지 더 보기"
            >
              <span>더 보기</span>
              <span className={styles.loadMoreIcon}>↓</span>
            </button>
          </div>
        )}
      </div>

      {/* 모달 */}
      {modalContent && typeof window !== 'undefined' && createPortal(
        modalContent,
        document.body
      )}
    </section>
  );
}
