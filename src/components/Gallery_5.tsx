'use client';

import type { RefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks';
import styles from './Gallery_5.module.css';

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

export default function Gallery_5({ images }: GalleryProps) {
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
    <section ref={elementRef as RefObject<HTMLElement>} className={styles.gallery}>
      <div className={styles.container}>
        <svg className={styles.topDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>

        <h2 className={styles.title}>記錄</h2>
        <p className={styles.subtitle}>Gallery</p>

        <div className={styles.grid}>
          {(isVisible ? displayImages : Array.from({ length: Math.min(6, Math.max(images.length, 4)) }, (_, index) => `placeholder-${index}`)).map((image, index) =>
            image.startsWith('placeholder-') ? (
              <div key={image} className={styles.imageItem}>
                <div className={styles.imagePlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              </div>
            ) : (
              <div key={image} className={styles.imageItem} onClick={() => setSelectedIndex(index)}>
                <Image
                  src={image}
                  alt={`Wedding photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
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
              </div>
            )
          )}
        </div>

        {images.length > 6 && (
          <button className={styles.loadMoreButton} onClick={() => setVisibleCount(hasMore ? Math.min(visibleCount + 6, images.length) : 6)} type="button">
            {hasMore ? `더보기 (${images.length - visibleCount}장 남음)` : '접기'}
          </button>
        )}

        <svg className={styles.bottomDecoration} viewBox="0 0 100 10">
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="var(--accent)" strokeWidth="1" />
        </svg>
      </div>

      {selectedImage && mounted && createPortal(
        <div className={styles.modal} onClick={() => setSelectedIndex(null)} role="dialog" aria-modal="true" tabIndex={-1}>
          <button className={styles.closeButton} onClick={() => setSelectedIndex(null)} type="button">
            ×
          </button>

          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalImageWrapper}>
              <Image src={selectedImage} alt={`갤러리 이미지 ${activeIndex + 1}`} fill sizes="100vw" quality={82} priority className={styles.modalImage} style={{ objectFit: 'contain' }} />
            </div>
          </div>

          <button className={`${styles.navButton} ${styles.prevButton}`} onClick={(event) => { event.stopPropagation(); setSelectedIndex((current) => (current === null ? current : (current - 1 + images.length) % images.length)); }} type="button">
            ‹
          </button>

          <button className={`${styles.navButton} ${styles.nextButton}`} onClick={(event) => { event.stopPropagation(); setSelectedIndex((current) => (current === null ? current : (current + 1) % images.length)); }} type="button">
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
