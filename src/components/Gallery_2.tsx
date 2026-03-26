'use client';

import type { RefObject } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks';
import styles from './Gallery_2.module.css';

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

export default function Gallery_2({ images }: GalleryProps) {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0, rootMargin: '700px 0px', triggerOnce: true });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [mounted, setMounted] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const displayImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMoreImages = images.length > visibleCount;
  const remainingCount = images.length - visibleCount;
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
        setSelectedIndex((current) => (current === null ? current : Math.max(0, current - 1)));
      } else if (event.key === 'ArrowRight') {
        setSelectedIndex((current) => (current === null ? current : Math.min(images.length - 1, current + 1)));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('no-scroll');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('no-scroll');
    };
  }, [images, selectedIndex]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const popupContent =
    selectedImage && mounted
      ? createPortal(
          <div className={styles.popup} onClick={() => setSelectedIndex(null)}>
            <div className={styles.popupContent} onClick={(event) => event.stopPropagation()}>
              <button className={styles.closeButton} onClick={() => setSelectedIndex(null)} type="button">
                ×
              </button>

              <div className={styles.popupImageWrapper}>
                <Image src={selectedImage} alt="확대 이미지" fill sizes="100vw" quality={82} priority className={styles.popupImage} style={{ objectFit: 'contain' }} />
              </div>

              <div className={styles.navigationBar}>
                <button className={`${styles.navArrow} ${styles.prevArrow}`} onClick={() => setSelectedIndex((current) => (current === null ? current : Math.max(0, current - 1)))} disabled={selectedIndex === null || selectedIndex <= 0} type="button">
                  ‹
                </button>
                <span className={styles.imageCounter}>
                  {activeIndex + 1} / {images.length}
                </span>
                <button className={`${styles.navArrow} ${styles.nextArrow}`} onClick={() => setSelectedIndex((current) => (current === null ? current : Math.min(images.length - 1, current + 1)))} disabled={selectedIndex === null || selectedIndex >= images.length - 1} type="button">
                  ›
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (!images.length) {
    return null;
  }

  return (
    <>
      <section ref={elementRef as RefObject<HTMLElement>} className={styles.container}>
        <h2 className={styles.title}>소중한 순간들</h2>
        <div className={styles.grid}>
          {(isVisible ? displayImages : Array.from({ length: Math.min(6, Math.max(images.length, 4)) }, (_, index) => `placeholder-${index}`)).map((image, index) =>
            image.startsWith('placeholder-') ? (
              <div key={image} className={styles.imageWrapper}>
                <div className={styles.imagePlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              </div>
            ) : (
              <div key={image} className={styles.imageWrapper} onClick={() => setSelectedIndex(index)}>
                <Image
                  src={image}
                  alt={`Wedding ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  quality={60}
                  loading={index < 2 ? 'eager' : 'lazy'}
                  className={styles.image}
                  onLoad={() => setLoadedImages((current) => new Set([...current, image]))}
                  style={{
                    objectFit: 'cover',
                    opacity: loadedImages.has(image) ? 1 : 0,
                    transition: 'opacity 0.22s ease',
                    cursor: 'pointer',
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
          <div className={styles.buttonContainer}>
            {hasMoreImages ? (
              <button className={styles.moreButton} onClick={() => setVisibleCount((current) => Math.min(current + 6, images.length))} type="button">
                더보기 ({remainingCount}장)
              </button>
            ) : (
              <button className={styles.lessButton} onClick={() => setVisibleCount(6)} type="button">
                접기
              </button>
            )}
          </div>
        )}
      </section>

      {popupContent}
    </>
  );
}
