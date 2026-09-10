'use client';

import type { RefObject } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Image from 'next/image';

import { useScrollAnimation } from '@/hooks';
import { useDialogLayer } from '@/hooks/useDialogLayer';

import WeddingGallerySwiper, { type WeddingGalleryVariant } from './WeddingGallerySwiper';

import { resolveGalleryOpacityTransition } from './galleryMotion';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export interface GalleryGridSharedProps {
  images: string[];
  previewImages?: string[];
  imagesLoading?: boolean;
  title?: string;
  styles: Record<string, string>;
  preloadAllImages?: boolean;
  showButtonIcons?: boolean;
  imageAltPrefix?: string;
  layout?: 'grid' | 'carousel';
  swiperVariant?: WeddingGalleryVariant;
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
  imageAltPrefix,
  layout = 'grid',
  swiperVariant,
}: GalleryGridSharedProps) {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold: 0,
    rootMargin: '700px 0px',
    triggerOnce: true,
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadedPopupImages, setLoadedPopupImages] = useState<Set<string>>(new Set());
  const [isPopupImageLoading, setIsPopupImageLoading] = useState(false);
  const [popupImageError, setPopupImageError] = useState<string | null>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const popupContentRef = useRef<HTMLDivElement | null>(null);
  const popupCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const lastIndex = Math.max(0, images.length - 1);
  if (carouselIndex > lastIndex) {
    setCarouselIndex(lastIndex);
  }
  if (selectedIndex !== null && (images.length === 0 || selectedIndex > lastIndex)) {
    setSelectedIndex(images.length === 0 ? null : lastIndex);
  }
  const isCarousel = layout === 'carousel';

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
  const isPopupOpen = selectedIndex !== null;
  const resolvedImageAltPrefix = imageAltPrefix?.trim() || title.trim() || '웨딩 갤러리';

  const getImageAlt = useCallback(
    (index: number) => `${resolvedImageAltPrefix} ${index + 1}번째 사진`,
    [resolvedImageAltPrefix]
  );

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

  useDialogLayer(popupContentRef, { open: isPopupOpen, onClose: closePopup });

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

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[role="dialog"]') !== popupContentRef.current) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevImage();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextImage();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);

    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
    };
  }, [goToNextImage, goToPrevImage, images, selectedIndex]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const openPopup = (index: number, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    triggerRef.current.focus();
    preloadPopupImageSet(images, index);
    setSelectedIndex(index);
    setPopupImageError(null);
    setIsPopupImageLoading(!loadedPopupImages.has(images[index]));
  };

  if (!hasImages && !imagesLoading) {
    return null;
  }

  return (
    <>
      <section ref={elementRef as RefObject<HTMLElement>} className={styles.container}>
        <h2 className={styles.title}>{title}</h2>

        {swiperVariant && hasImages ? (
          <WeddingGallerySwiper images={images} previewImages={previewImages} variant={swiperVariant} reducedMotion={prefersReducedMotion} altPrefix={resolvedImageAltPrefix} onOpen={openPopup} />
        ) : shouldRenderImages && hasImages ? (
          <div className={isCarousel ? styles.carousel : styles.imageGrid}>
            {(isCarousel ? images.slice(carouselIndex, carouselIndex + 1) : displayImages).map((image, offset) => {
              const index = isCarousel ? carouselIndex : offset;
              const previewImage = isCarousel
                ? previewImages?.[index] ?? image
                : displayPreviewImages[index] ?? image;

              return (
                <div key={isCarousel ? 'carousel-image' : `${image}-${index}`} className={styles.imageWrapper}>
                  <button
                    type="button"
                    className={styles.imageContainer}
                    aria-label={`${resolvedImageAltPrefix} ${index + 1}번째 사진 크게 보기`}
                    onClick={(event) => openPopup(index, event.currentTarget)}
                    onMouseEnter={() => {
                      preloadPopupImageSet(images, index);
                    }}
                    onTouchStart={() => {
                      preloadPopupImageSet(images, index);
                    }}
                  >
                    <Image
                      key={previewImage}
                      className={styles.imageItem}
                      src={previewImage}
                      alt={getImageAlt(index)}
                      fill
                      sizes={isCarousel ? '(max-width: 700px) 90vw, 600px' : '(max-width: 700px) 50vw, 33vw'}
                      quality={60}
                      loading="lazy"
                      onLoad={() =>
                        setLoadedImages((current) => new Set([...current, previewImage]))
                      }
                      style={{
                        objectFit: isCarousel ? 'contain' : 'cover',
                        opacity: loadedImages.has(previewImage) ? 1 : 0,
                        transition: resolveGalleryOpacityTransition(
                          prefersReducedMotion,
                          220
                        ),
                      }}
                    />
                  </button>
                  {!loadedImages.has(previewImage)
                    ? renderLoadingPlaceholder(styles)
                    : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={isCarousel ? styles.carousel : styles.imageGrid} aria-hidden="true">
            {Array.from({ length: isCarousel ? 1 : Math.min(6, Math.max(images.length, 3)) }).map((_, index) => (
              <div key={index} className={styles.imageWrapper}>
                {renderLoadingPlaceholder(styles)}
              </div>
            ))}
          </div>
        )}

        {!swiperVariant && isCarousel && hasImages && (
          <div className={styles.carouselControls}>
            <button
              type="button"
              className={styles.carouselButton}
              style={{ minWidth: 44, minHeight: 44 }}
              disabled={carouselIndex === 0}
              onClick={() => {
                const nextIndex = Math.max(0, carouselIndex - 1);
                preloadPopupImageSet(images, nextIndex);
                setCarouselIndex(nextIndex);
              }}
            >
              이전 사진
            </button>
            <span className={styles.carouselCounter} aria-live="polite" aria-atomic="true">
              {carouselIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              className={styles.carouselButton}
              style={{ minWidth: 44, minHeight: 44 }}
              disabled={carouselIndex >= images.length - 1}
              onClick={() => {
                const nextIndex = Math.min(images.length - 1, carouselIndex + 1);
                preloadPopupImageSet(images, nextIndex);
                setCarouselIndex(nextIndex);
              }}
            >
              다음 사진
            </button>
          </div>
        )}

        {!swiperVariant && !isCarousel && images.length > 6 && (
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
          <div
            ref={popupContentRef}
            className={styles.popupContent}
            role="dialog"
            aria-modal="true"
            aria-label={`${resolvedImageAltPrefix} 크게 보기`}
            aria-busy={isPopupBusy}
          >
            <button
              ref={popupCloseButtonRef}
              data-dialog-initial-focus
              className={styles.closeButton}
              onClick={closePopup}
              type="button"
              aria-label="갤러리 크게 보기 닫기"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div
              className={`${styles.popupImageWrapper} ${
                isPopupBusy ? styles.popupImageWrapperLoading : ''
              }`}
            >
              {isPopupImageLoading ? (
                <div
                  role="status"
                  aria-live="polite"
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
                  role="alert"
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
                alt={getImageAlt(activeIndex)}
                width={1600}
                height={1067}
                sizes="(max-width: 767px) 92vw, 86vw"
                quality={75}
                priority
                fetchPriority="high"
                className={styles.popupImage}
                onLoad={() => {
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
                  transition: resolveGalleryOpacityTransition(
                    prefersReducedMotion,
                    180
                  ),
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
