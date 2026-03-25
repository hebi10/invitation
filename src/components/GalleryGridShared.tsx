'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

export interface GalleryGridSharedProps {
  images: string[];
  title?: string;
  styles: Record<string, string>;
  preloadAllImages?: boolean;
  showButtonIcons?: boolean;
}

export default function GalleryGridShared({
  images,
  title = '사진의 순간들',
  styles,
  preloadAllImages = false,
  showButtonIcons = false,
}: GalleryGridSharedProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);

  const displayImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMoreImages = useMemo(() => images.length > visibleCount, [images.length, visibleCount]);
  const remainingCount = useMemo(() => images.length - visibleCount, [images.length, visibleCount]);
  const selectedImage = selectedIndex === null ? null : images[selectedIndex];

  useEffect(() => {
    if (!preloadAllImages) {
      return;
    }

    images.forEach((imageSrc) => {
      if (preloadedImages.has(imageSrc)) {
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        setPreloadedImages((current) => new Set([...current, imageSrc]));
      };
      img.src = imageSrc;
    });
  }, [images, preloadAllImages, preloadedImages]);

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

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
  }, [selectedImage, isTransitioning, selectedIndex, images.length]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const handleImageLoad = (imageSrc: string) => {
    setLoadedImages((current) => new Set([...current, imageSrc]));
  };

  const openPopup = (index: number) => {
    setSelectedIndex(index);
    setIsTransitioning(false);
  };

  const closePopup = () => {
    setSelectedIndex(null);
    setIsTransitioning(false);
  };

  const goToPrevImage = () => {
    if (selectedIndex === null || selectedIndex <= 0 || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setSelectedIndex((current) => (current === null ? current : current - 1));
      setIsTransitioning(false);
    }, 200);
  };

  const goToNextImage = () => {
    if (selectedIndex === null || selectedIndex >= images.length - 1 || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setSelectedIndex((current) => (current === null ? current : current + 1));
      setIsTransitioning(false);
    }, 200);
  };

  const showMoreImages = () => {
    const nextVisibleCount = Math.min(visibleCount + 6, images.length);

    if (preloadAllImages) {
      images.slice(visibleCount, nextVisibleCount).forEach((imageSrc) => {
        if (preloadedImages.has(imageSrc)) {
          setLoadedImages((current) => new Set([...current, imageSrc]));
        }
      });
    }

    setVisibleCount(nextVisibleCount);
  };

  const showLessImages = () => {
    setVisibleCount(6);
  };

  return (
    <>
      <section className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
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
                  quality={70}
                  onClick={() => openPopup(index)}
                  onLoad={() => handleImageLoad(image)}
                  style={{
                    objectFit: 'cover',
                    opacity: loadedImages.has(image) || preloadedImages.has(image) ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    cursor: 'pointer',
                  }}
                />
              </div>
              {!(loadedImages.has(image) || preloadedImages.has(image)) && (
                <div className={styles.imagePlaceholder}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {images.length > 6 && (
          <div className={styles.buttonContainer}>
            {hasMoreImages && (
              <button className={styles.moreButton} onClick={showMoreImages} type="button">
                {showButtonIcons && 'buttonIcon' in styles && <span className={styles.buttonIcon}>↓</span>}
                더보기 ({remainingCount}장)
              </button>
            )}

            {visibleCount > 6 && (
              <button className={styles.lessButton} onClick={showLessImages} type="button">
                {showButtonIcons && 'buttonIcon' in styles && <span className={styles.buttonIcon}>↑</span>}
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
              <Image
                src={selectedImage}
                alt="선택한 이미지"
                fill
                sizes="100vw"
                quality={85}
                priority
                className={styles.popupImage}
                style={{
                  objectFit: 'contain',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              />
            </div>

            <div className={styles.navigationBar}>
              <button
                className={`${styles.navArrow} ${styles.prevArrow}`}
                onClick={goToPrevImage}
                disabled={isTransitioning || selectedIndex === null || selectedIndex <= 0}
                type="button"
              >
                ‹
              </button>

              <span className={styles.imageCounter}>
                {(selectedIndex ?? 0) + 1} / {images.length}
              </span>

              <button
                className={`${styles.navArrow} ${styles.nextArrow}`}
                onClick={goToNextImage}
                disabled={isTransitioning || selectedIndex === null || selectedIndex >= images.length - 1}
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
