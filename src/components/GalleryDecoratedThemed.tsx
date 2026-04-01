'use client';

import type { RefObject, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

import { useScrollAnimation } from '@/hooks';

interface GalleryDecoratedThemedProps {
  images: string[];
  styles: Record<string, string>;
  renderHeader: (styles: Record<string, string>) => ReactNode;
  renderFooter?: (styles: Record<string, string>) => ReactNode;
  renderImageOverlay?: (styles: Record<string, string>) => ReactNode;
  ariaLabel?: string;
}

function preloadImage(url?: string) {
  if (!url || typeof window === 'undefined') {
    return;
  }

  const image = new window.Image();
  image.decoding = 'async';
  image.src = url;
}

export default function GalleryDecoratedThemed({
  images,
  styles,
  renderHeader,
  renderFooter,
  renderImageOverlay,
  ariaLabel = '갤러리',
}: GalleryDecoratedThemedProps) {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold: 0,
    rootMargin: '700px 0px',
    triggerOnce: true,
  });
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const displayImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMore = visibleCount < images.length;
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];
  const activeIndex = selectedIndex ?? 0;
  const itemClassName = styles.imageCard || styles.imageItem;
  const hasImageWrapper = 'imageWrapper' in styles;

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
        setSelectedIndex((current) =>
          current === null ? current : (current - 1 + images.length) % images.length
        );
      } else if (event.key === 'ArrowRight') {
        setSelectedIndex((current) =>
          current === null ? current : (current + 1) % images.length
        );
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
    <section
      ref={elementRef as RefObject<HTMLElement>}
      className={styles.gallery}
      aria-label={ariaLabel}
    >
      <div className={styles.container}>
        {renderHeader(styles)}

        <div className={styles.grid}>
          {(isVisible
            ? displayImages
            : Array.from(
                { length: Math.min(6, Math.max(images.length, 4)) },
                (_, index) => `placeholder-${index}`
              )
          ).map((image, index) =>
            image.startsWith('placeholder-') ? (
              <div key={image} className={itemClassName}>
                {hasImageWrapper ? (
                  <div className={styles.imageWrapper}>
                    <div className={styles.imagePlaceholder}>
                      <div className={styles.loadingSpinner}></div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <div className={styles.loadingSpinner}></div>
                  </div>
                )}
              </div>
            ) : (
              <div
                key={image}
                className={itemClassName}
                onClick={() => setSelectedIndex(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedIndex(index);
                  }
                }}
              >
                {hasImageWrapper ? (
                  <div className={styles.imageWrapper}>
                    <Image
                      src={image}
                      alt={`갤러리 이미지 ${index + 1}`}
                      fill
                      sizes="(max-width: 700px) 50vw, 33vw"
                      quality={60}
                      loading={index < 2 ? 'eager' : 'lazy'}
                      className={styles.image}
                      onLoad={() =>
                        setLoadedImages((current) => new Set([...current, image]))
                      }
                      style={{
                        objectFit: 'cover',
                        opacity: loadedImages.has(image) ? 1 : 0,
                        transition: 'opacity 0.22s ease',
                      }}
                    />
                    {!loadedImages.has(image) ? (
                      <div className={styles.imagePlaceholder}>
                        <div className={styles.loadingSpinner}></div>
                      </div>
                    ) : null}
                    {renderImageOverlay ? renderImageOverlay(styles) : null}
                  </div>
                ) : (
                  <>
                    <Image
                      src={image}
                      alt={`갤러리 이미지 ${index + 1}`}
                      fill
                      sizes="(max-width: 700px) 50vw, 33vw"
                      quality={60}
                      loading={index < 2 ? 'eager' : 'lazy'}
                      className={styles.image}
                      onLoad={() =>
                        setLoadedImages((current) => new Set([...current, image]))
                      }
                      style={{
                        objectFit: 'cover',
                        opacity: loadedImages.has(image) ? 1 : 0,
                        transition: 'opacity 0.22s ease',
                      }}
                    />
                    {!loadedImages.has(image) ? (
                      <div className={styles.imagePlaceholder}>
                        <div className={styles.loadingSpinner}></div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )
          )}
        </div>

        {images.length > 6 ? (
          <button
            className={styles.loadMoreButton}
            onClick={() =>
              setVisibleCount(
                hasMore ? Math.min(visibleCount + 6, images.length) : 6
              )
            }
            type="button"
          >
            <span>
              {hasMore
                ? 'loadMoreIcon' in styles
                  ? '더 보기'
                  : `더보기 (${images.length - visibleCount}장 남음)`
                : '접기'}
            </span>
            {'loadMoreIcon' in styles ? (
              <span className={styles.loadMoreIcon}>{hasMore ? '↓' : '↑'}</span>
            ) : null}
          </button>
        ) : null}

        {renderFooter ? renderFooter(styles) : null}
      </div>

      {selectedImage && mounted
        ? createPortal(
            <div
              className={styles.modal}
              onClick={() => setSelectedIndex(null)}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
            >
              <button
                className={styles.closeButton}
                onClick={() => setSelectedIndex(null)}
                aria-label="닫기"
                type="button"
              >
                ×
              </button>

              <div
                className={styles.modalContent}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.modalImageWrapper}>
                  <Image
                    src={selectedImage}
                    alt={`갤러리 이미지 ${activeIndex + 1}`}
                    fill
                    sizes="100vw"
                    quality={82}
                    priority
                    className={styles.modalImage}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>

              <button
                className={`${styles.navButton} ${styles.prevButton ?? ''}`.trim()}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedIndex((current) =>
                    current === null
                      ? current
                      : (current - 1 + images.length) % images.length
                  );
                }}
                aria-label="이전 이미지"
                type="button"
              >
                ‹
              </button>

              <button
                className={`${styles.navButton} ${styles.nextButton ?? ''}`.trim()}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedIndex((current) =>
                    current === null ? current : (current + 1) % images.length
                  );
                }}
                aria-label="다음 이미지"
                type="button"
              >
                ›
              </button>

              <div className={styles.imageCounter}>
                {activeIndex + 1} / {images.length}
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
