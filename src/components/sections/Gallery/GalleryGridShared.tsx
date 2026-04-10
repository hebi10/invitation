'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import { useScrollAnimation } from '@/hooks';

export interface GalleryGridSharedProps {
  images: string[];
  previewImages?: string[];
  imagesLoading?: boolean;
  title?: string;
  styles: Record<string, string>;
  preloadAllImages?: boolean;
  showButtonIcons?: boolean;
}

function preloadSingleImage(url?: string) {
  if (!url || typeof window === 'undefined') {
    return;
  }

  const image = new window.Image();
  image.decoding = 'async';
  image.src = url;
}

function preloadPopupImageSet(images: string[], index: number) {
  preloadSingleImage(images[index]);
  preloadSingleImage(images[index - 1]);
  preloadSingleImage(images[index + 1]);
}

function renderLoadingPlaceholder(
  styles: Record<string, string>,
  message = '이미지 로딩 중'
) {
  return (
    <div className={styles.imagePlaceholder}>
      <div className={styles.placeholderContent}>
        <div className={styles.loadingSpinner}></div>
        <span className={styles.loadingText}>{message}</span>
      </div>
    </div>
  );
}

export default function GalleryGridShared({
  images,
  previewImages,
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
  const displayPreviewImages = useMemo(
    () => (previewImages ?? images).slice(0, visibleCount),
    [images, previewImages, visibleCount]
  );
  const hasMoreImages = images.length > visibleCount;
  const remainingCount = images.length - visibleCount;
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];
  const activeIndex = selectedIndex ?? 0;
  const hasImages = images.length > 0;
  const isPopupBusy = isPopupImageLoading;

  if (!hasImages && !imagesLoading) {
    return null;
  }

  useEffect(() => {
    if (!shouldRenderImages || !preloadAllImages) {
      return;
    }

    const targets = (previewImages ?? images).slice(0, Math.min(visibleCount + 3, images.length));
    targets.forEach(preloadSingleImage);
  }, [images, preloadAllImages, previewImages, shouldRenderImages, visibleCount]);

  useEffect(() => {
    if (!selectedImage || selectedIndex === null) {
      return;
    }

    setPopupImageError(null);
    setIsPopupImageLoading(!loadedPopupImages.has(selectedImage));

    preloadPopupImageSet(images, selectedIndex);
  }, [images, loadedPopupImages, selectedImage, selectedIndex]);

  const closePopup = useCallback(() => {
    setSelectedIndex(null);
    setIsPopupImageLoading(false);
    setPopupImageError(null);
  }, []);

  const goToPrevImage = useCallback(() => {
    if (selectedIndex === null || selectedIndex <= 0) {
      return;
    }

    const nextIndex = selectedIndex - 1;
    preloadPopupImageSet(images, nextIndex);
    setSelectedIndex(nextIndex);
  }, [images, selectedIndex]);

  const goToNextImage = useCallback(() => {
    if (selectedIndex === null || selectedIndex >= images.length - 1) {
      return;
    }

    const nextIndex = selectedIndex + 1;
    preloadPopupImageSet(images, nextIndex);
    setSelectedIndex(nextIndex);
  }, [images, selectedIndex]);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    preloadPopupImageSet(images, selectedIndex);

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
  }, [closePopup, goToNextImage, goToPrevImage, images, selectedIndex]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const openPopup = (index: number) => {
    preloadPopupImageSet(images, index);
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
            {displayImages.map((image, index) => {
              const previewImage = displayPreviewImages[index] ?? image;

              return (
                <div key={`${image}-${index}`} className={styles.imageWrapper}>
                  <div className={styles.imageContainer}>
                    <Image
                      className={styles.imageItem}
                      src={previewImage}
                      alt={`Gallery image ${index + 1}`}
                      fill
                      sizes="(max-width: 700px) 50vw, 33vw"
                      quality={60}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      onClick={() => openPopup(index)}
                      onMouseEnter={() => {
                        preloadPopupImageSet(images, index);
                      }}
                      onTouchStart={() => {
                        preloadPopupImageSet(images, index);
                      }}
                      onLoad={() =>
                        setLoadedImages((current) => new Set([...current, previewImage]))
                      }
                      style={{
                        objectFit: 'cover',
                        opacity: loadedImages.has(previewImage) ? 1 : 0,
                        transition: 'opacity 0.22s ease',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                  {!loadedImages.has(previewImage)
                    ? renderLoadingPlaceholder(styles)
                    : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.imageGrid} aria-hidden="true">
            {Array.from({ length: Math.min(6, Math.max(images.length, 3)) }).map((_, index) => (
              <div key={index} className={styles.imageWrapper}>
                {renderLoadingPlaceholder(styles)}
              </div>
            ))}
          </div>
        )}

        {images.length > 6 && (
          <div className={styles.buttonContainer}>
            {hasMoreImages && (
              <button
                className={styles.moreButton}
                onClick={() => setVisibleCount((current) => Math.min(current + 6, images.length))}
                type="button"
              >
                {showButtonIcons && 'buttonIcon' in styles ? (
                  <span className={styles.buttonIcon}>+</span>
                ) : null}
                더보기({remainingCount}장)
              </button>
            )}

            {visibleCount > 6 && (
              <button
                className={styles.lessButton}
                onClick={() => setVisibleCount(6)}
                type="button"
              >
                {showButtonIcons && 'buttonIcon' in styles ? (
                  <span className={styles.buttonIcon}>-</span>
                ) : null}
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
              X
            </button>

            <div
              className={`${styles.popupImageWrapper} ${
                isPopupBusy ? styles.popupImageWrapperLoading : ''
              }`}
            >
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
                  <div className={styles.popupLoadingContent}>
                    <div className={styles.loadingSpinner}></div>
                    <span className={styles.popupLoadingText}>이미지를 불러오는 중...</span>
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
                  이미지를 불러오지 못했습니다.
                </div>
              ) : null}

              <Image
                key={selectedImage}
                src={selectedImage}
                alt="선택된 이미지"
                width={1600}
                height={1067}
                sizes="(max-width: 767px) 92vw, 86vw"
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
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '92vw',
                  maxHeight: '78dvh',
                  opacity: isPopupImageLoading || Boolean(popupImageError) ? 0 : 1,
                  transition: 'opacity 0.18s ease',
                }}
              />
            </div>

            <div
              className={`${styles.navigationBar} ${
                isPopupBusy ? styles.navigationBarHidden : ''
              }`}
            >
              <button
                className={`${styles.navArrow} ${styles.prevArrow}`}
                aria-label="이전 이미지"
                onClick={goToPrevImage}
                disabled={selectedIndex === null || selectedIndex <= 0}
                type="button"
              >
                {'<'}
              </button>

              <span className={styles.imageCounter}>
                {activeIndex + 1} / {images.length}
              </span>

              <button
                className={`${styles.navArrow} ${styles.nextArrow}`}
                aria-label="다음 이미지"
                onClick={goToNextImage}
                disabled={selectedIndex === null || selectedIndex >= images.length - 1}
                type="button"
              >
                {'>'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
