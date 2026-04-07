'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks';

export interface GalleryGridSharedProps {
  images: string[];
  imagesLoading?: boolean;
  title?: string;
  styles: Record<string, string>;
  preloadAllImages?: boolean;
  showButtonIcons?: boolean;
}

function preloadSingleImage(url: string) {
  if (!url || typeof window === 'undefined') {
    return;
  }

  const image = new window.Image();
  image.decoding = 'async';
  image.src = url;
}

export default function GalleryGridShared({
  images,
  imagesLoading = false,
  title = '소중한 순간들',
  styles,
  preloadAllImages = false,
  showButtonIcons = false,
}: GalleryGridSharedProps) {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold: 0,
    rootMargin: '700px 0px',
    triggerOnce: true,
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadedPopupImages, setLoadedPopupImages] = useState<Set<string>>(new Set());
  const [isPopupImageLoading, setIsPopupImageLoading] = useState(false);
  const [popupImageError, setPopupImageError] = useState<string | null>(null);

  const shouldRenderImages = isVisible || selectedIndex !== null;
  const displayImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMoreImages = images.length > visibleCount;
  const remainingCount = images.length - visibleCount;
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];
  const activeIndex = selectedIndex ?? 0;
  const hasImages = images.length > 0;

  if (!hasImages && !imagesLoading) {
    return null;
  }

  useEffect(() => {
    if (!shouldRenderImages) {
      return;
    }

    const targetCount = preloadAllImages
      ? Math.min(visibleCount + 3, images.length)
      : Math.min(displayImages.length, 4);
    const targets = preloadAllImages ? images.slice(0, targetCount) : displayImages.slice(0, targetCount);
    targets.forEach(preloadSingleImage);
  }, [displayImages, images, preloadAllImages, shouldRenderImages, visibleCount]);

  useEffect(() => {
    if (!selectedImage || selectedIndex === null) {
      return;
    }

    setPopupImageError(null);
    setIsPopupImageLoading(!loadedPopupImages.has(selectedImage));

    preloadSingleImage(selectedImage);
    preloadSingleImage(images[selectedIndex - 1]);
    preloadSingleImage(images[selectedIndex + 1]);
    preloadSingleImage(images[selectedIndex + 2]);
  }, [images, loadedPopupImages, selectedImage, selectedIndex]);

  const closePopup = useCallback(() => {
    setSelectedIndex(null);
    setIsPopupImageLoading(false);
    setPopupImageError(null);
  }, []);

  const goToPrevImage = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || current <= 0) {
        return current;
      }

      return current - 1;
    });
  }, []);

  const goToNextImage = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || current >= images.length - 1) {
        return current;
      }

      return current + 1;
    });
  }, [images.length]);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    preloadSingleImage(images[selectedIndex - 1]);
    preloadSingleImage(images[selectedIndex + 1]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIndex(null);
        return;
      }

      if (event.key === 'ArrowLeft') {
        goToPrevImage();
      }

      if (event.key === 'ArrowRight') {
        goToNextImage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('no-scroll');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('no-scroll');
    };
  }, [selectedIndex, images, closePopup, goToPrevImage, goToNextImage]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const openPopup = (index: number) => {
    setSelectedIndex(index);
    setPopupImageError(null);
    setIsPopupImageLoading(!loadedPopupImages.has(images[index]));
  };

  return (
    <>
      <section ref={elementRef as RefObject<HTMLElement>} className={styles.container}>
        <h2 className={styles.title}>{title}</h2>

        {shouldRenderImages && hasImages ? (
          <div className={styles.imageGrid}>
            {displayImages.map((image, index) => (
              <div key={`${image}-${index}`} className={styles.imageWrapper}>
                <div className={styles.imageContainer}>
                  <Image
                    className={styles.imageItem}
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    sizes="(max-width: 700px) 50vw, 33vw"
                    quality={60}
                    loading={index < 3 ? 'eager' : 'lazy'}
                    onClick={() => openPopup(index)}
                    onMouseEnter={() => {
                      preloadSingleImage(images[index]);
                      preloadSingleImage(images[index + 1]);
                    }}
                    onTouchStart={() => {
                      preloadSingleImage(images[index]);
                      preloadSingleImage(images[index + 1]);
                    }}
                    onLoad={() => setLoadedImages((current) => new Set([...current, image]))}
                    style={{
                      objectFit: 'cover',
                      opacity: loadedImages.has(image) ? 1 : 0,
                      transition: 'opacity 0.22s ease',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                {!loadedImages.has(image) && (
                  <div className={styles.imagePlaceholder}>
                    <div className={styles.loadingSpinner}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.imageGrid} aria-hidden="true">
            {Array.from({ length: Math.min(6, Math.max(images.length, 3)) }).map((_, index) => (
              <div key={index} className={styles.imageWrapper}>
                <div className={styles.imagePlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length > 6 && (
          <div className={styles.buttonContainer}>
            {hasMoreImages && (
              <button className={styles.moreButton} onClick={() => setVisibleCount((current) => Math.min(current + 6, images.length))} type="button">
                {showButtonIcons && 'buttonIcon' in styles && <span className={styles.buttonIcon}>+</span>}
                더보기 ({remainingCount}장)
              </button>
            )}

            {visibleCount > 6 && (
              <button className={styles.lessButton} onClick={() => setVisibleCount(6)} type="button">
                {showButtonIcons && 'buttonIcon' in styles && <span className={styles.buttonIcon}>-</span>}
                접기
              </button>
            )}
          </div>
        )}
      </section>

      {selectedImage && (
        <div
          className={styles.popup}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePopup();
            }
          }}
        >
          <div className={styles.popupContent}>
            <button className={styles.closeButton} onClick={closePopup} type="button">
              ×
            </button>

            <div className={styles.popupImageWrapper}>
              {isPopupImageLoading ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(20, 20, 20, 0.75)',
                    borderRadius: '12px',
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'grid', gap: '0.65rem', justifyItems: 'center' }}>
                    <div className={styles.loadingSpinner}></div>
                    <span style={{ color: '#f3f4f6', fontSize: '0.9rem' }}>이미지 불러오는 중...</span>
                  </div>
                </div>
              ) : null}

              {popupImageError ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(20, 20, 20, 0.75)',
                    borderRadius: '12px',
                    zIndex: 2,
                    color: '#f3f4f6',
                    fontSize: '0.95rem',
                  }}
                >
                  이미지 불러오기에 실패했습니다.
                </div>
              ) : null}

              <Image
                key={selectedImage}
                src={selectedImage}
                alt="선택한 이미지"
                fill
                sizes="100vw"
                quality={75}
                priority
                fetchPriority="high"
                className={styles.popupImage}
                onLoadingComplete={() => {
                  setLoadedPopupImages((current) => new Set([...current, selectedImage]));
                  setIsPopupImageLoading(false);
                  setPopupImageError(null);
                }}
                onError={() => {
                  setIsPopupImageLoading(false);
                  setPopupImageError('load-failed');
                }}
                style={{
                  objectFit: 'contain',
                  opacity: isPopupImageLoading || Boolean(popupImageError) ? 0 : 1,
                  transition: 'opacity 0.18s ease',
                }}
              />
            </div>

            <div className={styles.navigationBar}>
              <button
                className={`${styles.navArrow} ${styles.prevArrow}`}
                onClick={goToPrevImage}
                disabled={selectedIndex === null || selectedIndex <= 0}
                type="button"
              >
                ‹
              </button>

              <span className={styles.imageCounter}>
                {activeIndex + 1} / {images.length}
              </span>

              <button
                className={`${styles.navArrow} ${styles.nextArrow}`}
                onClick={goToNextImage}
                disabled={selectedIndex === null || selectedIndex >= images.length - 1}
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
