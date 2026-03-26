'use client';

import type { RefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks';
import styles from './Gallery_3.module.css';

interface GalleryProps {
  images: string[];
}

function preloadImage(url?: string) {
  if (!url || typeof window === 'undefined') {
    return;
  }

  const image = new window.Image();
  image.decoding = 'async';
  image.src = url;
}

export default function Gallery_3({ images }: GalleryProps) {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0, rootMargin: '700px 0px', triggerOnce: true });
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const displayImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMore = visibleCount < images.length;
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];
  const activeIndex = selectedIndex ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible) {
      displayImages.slice(0, 2).forEach(preloadImage);
    }
  }, [displayImages, isVisible]);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    preloadImage(images[selectedIndex - 1]);
    preloadImage(images[selectedIndex + 1]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIndex(null);
      } else if (event.key === 'ArrowLeft') {
        setSelectedIndex((current) => (current === null ? current : (current - 1 + images.length) % images.length));
      } else if (event.key === 'ArrowRight') {
        setSelectedIndex((current) => (current === null ? current : (current + 1) % images.length));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [images, selectedIndex]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!images.length) {
    return null;
  }

  return (
    <section ref={elementRef as RefObject<HTMLElement>} className={styles.container}>
      <div className={styles.spaceBackground}>
        <div className={styles.stars}></div>
      </div>

      <div className={styles.header}>
        <div className={styles.starIcon}>✦</div>
        <h2 className={styles.title}>Gallery</h2>
        <div className={styles.starIcon}>✦</div>
      </div>

      <div className={styles.grid}>
        {(isVisible ? displayImages : Array.from({ length: Math.min(6, Math.max(images.length, 4)) }, (_, index) => `placeholder-${index}`)).map((image, index) =>
          image.startsWith('placeholder-') ? (
            <div key={image} className={styles.imageItem}>
              <div className={styles.imageWrapper}>
                <div className={styles.imagePlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={image}
              className={styles.imageItem}
              onClick={() => setSelectedIndex(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setSelectedIndex(index);
                }
              }}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={image}
                  alt={`갤러리 이미지 ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 25vw"
                  quality={60}
                  loading={index < 2 ? 'eager' : 'lazy'}
                  className={styles.image}
                  onLoad={() => setLoadedImages((current) => new Set([...current, image]))}
                  style={{
                    objectFit: 'cover',
                    opacity: loadedImages.has(image) ? 1 : 0,
                    transition: 'opacity 0.22s ease',
                  }}
                />
                {!loadedImages.has(image) && (
                  <div className={styles.imagePlaceholder}>
                    <div className={styles.loadingSpinner}></div>
                  </div>
                )}
                <div className={styles.imageOverlay}>
                  <div className={styles.zoomIcon}>+</div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {images.length > 6 && (
        <div className={styles.buttonWrapper}>
          <button className={styles.toggleButton} onClick={() => setVisibleCount(hasMore ? Math.min(visibleCount + 6, images.length) : 6)} type="button">
            <span className={styles.buttonText}>{hasMore ? `더보기 (+${Math.min(6, images.length - visibleCount)})` : '접기'}</span>
            <span className={`${styles.buttonIcon} ${!hasMore ? styles.rotated : ''}`}>{hasMore ? '↓' : '↑'}</span>
          </button>
        </div>
      )}

      {selectedImage && mounted && createPortal(
        <div className={styles.modal} onClick={() => setSelectedIndex(null)} role="dialog" aria-modal="true" tabIndex={-1}>
          <div className={styles.modalBackground}>
            <div className={styles.modalStars}></div>
          </div>

          <button className={styles.closeButton} onClick={() => setSelectedIndex(null)} aria-label="닫기" type="button">
            ×
          </button>

          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalImageWrapper}>
              <Image src={selectedImage} alt={`갤러리 이미지 ${activeIndex + 1}`} fill sizes="100vw" quality={82} priority className={styles.modalImage} style={{ objectFit: 'contain' }} />
            </div>
            <div className={styles.imageGlow}></div>
          </div>

          <button className={`${styles.navButton} ${styles.prevButton}`} onClick={(event) => { event.stopPropagation(); setSelectedIndex((current) => (current === null ? current : (current - 1 + images.length) % images.length)); }} aria-label="이전 이미지" type="button">
            ‹
          </button>

          <button className={`${styles.navButton} ${styles.nextButton}`} onClick={(event) => { event.stopPropagation(); setSelectedIndex((current) => (current === null ? current : (current + 1) % images.length)); }} aria-label="다음 이미지" type="button">
            ›
          </button>

          <div className={styles.imageCounter}>
            {activeIndex + 1} / {images.length}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
