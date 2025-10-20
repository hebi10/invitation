'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Gallery_3.module.css';

interface GalleryProps {
  images: string[];
}

export default function Gallery_3({ images }: GalleryProps) {
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
      <div className={styles.modalBackground}>
        <div className={styles.modalStars}></div>
      </div>
      
      <button
        className={styles.closeButton}
        onClick={() => setSelectedImage(null)}
        aria-label="닫기"
      >
        <span className={styles.closeIcon}>✕</span>
      </button>

      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <img
          src={images[selectedImage]}
          alt={`갤러리 이미지 ${selectedImage + 1}`}
          className={styles.modalImage}
        />
        <div className={styles.imageGlow}></div>
      </div>

      <button
        className={`${styles.navButton} ${styles.prevButton}`}
        onClick={(e) => {
          e.stopPropagation();
          handlePrevImage();
        }}
        aria-label="이전 이미지"
      >
        <span className={styles.navArrow}>‹</span>
      </button>

      <button
        className={`${styles.navButton} ${styles.nextButton}`}
        onClick={(e) => {
          e.stopPropagation();
          handleNextImage();
        }}
        aria-label="다음 이미지"
      >
        <span className={styles.navArrow}>›</span>
      </button>

      <div className={styles.imageCounter}>
        {selectedImage + 1} / {images.length}
      </div>
    </div>
  );

  return (
    <section className={styles.container}>
      {/* 우주 배경 */}
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      {/* 타이틀 */}
      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>Gallery</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      {/* 이미지 그리드 */}
      <div className={styles.grid}>
        {displayImages.map((image, index) => (
          <div
            key={index}
            className={styles.imageItem}
            onClick={() => setSelectedImage(images.indexOf(image))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedImage(images.indexOf(image));
              }
            }}
          >
            <div className={styles.imageWrapper}>
              <img
                src={image}
                alt={`갤러리 이미지 ${index + 1}`}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.imageOverlay}>
                <div className={styles.zoomIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 14L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className={styles.itemGlow}></div>
            </div>
          </div>
        ))}
      </div>

      {/* 더보기/접기 버튼 */}
      {images.length > 6 && (
        <div className={styles.buttonWrapper}>
          <button
            onClick={() => {
              if (hasMore) {
                setVisibleCount(prev => Math.min(prev + 6, images.length));
              } else {
                setVisibleCount(6);
              }
            }}
            className={styles.toggleButton}
          >
            <span className={styles.buttonText}>
              {hasMore ? `더보기 (+${Math.min(6, images.length - visibleCount)})` : '접기'}
            </span>
            <span className={`${styles.buttonIcon} ${!hasMore ? styles.rotated : ''}`}>
              ▼
            </span>
          </button>
        </div>
      )}

      {/* 모달 (Portal) */}
      {mounted && typeof document !== 'undefined' && modalContent && createPortal(
        modalContent,
        document.body
      )}
    </section>
  );
}
