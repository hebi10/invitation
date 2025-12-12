'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './Gallery_2.module.css';

interface GalleryProps {
  images: string[];
}

export default function Gallery_2({ images }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(6);
  const [imageSize, setImageSize] = useState({ width: 'auto', height: 'auto' });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // 이미지 미리 로딩 함수
  const preloadImages = useCallback(() => {
    images.forEach((imageSrc) => {
      if (!preloadedImages.has(imageSrc)) {
        const img = new window.Image();
        img.onload = () => {
          setPreloadedImages(prev => new Set([...prev, imageSrc]));
        };
        img.src = imageSrc;
      }
    });
  }, [images, preloadedImages]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 컴포넌트 마운트 시 이미지 미리 로딩
  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  const displayImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMoreImages = useMemo(() => images.length > visibleCount, [images.length, visibleCount]);
  const remainingCount = useMemo(() => images.length - visibleCount, [images.length, visibleCount]);

  const calculateImageSize = useCallback((img: HTMLImageElement) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = viewportWidth >= 768 ? 80 : 40;
    
    const maxWidth = viewportWidth - padding;
    const maxHeight = viewportHeight - padding;
    
    let newWidth = img.naturalWidth;
    let newHeight = img.naturalHeight;
    
    if (newWidth > maxWidth) {
      newHeight = (newHeight * maxWidth) / newWidth;
      newWidth = maxWidth;
    }
    
    if (newHeight > maxHeight) {
      newWidth = (newWidth * maxHeight) / newHeight;
      newHeight = maxHeight;
    }
    
    return { width: `${newWidth}px`, height: `${newHeight}px` };
  }, []);

  const openLightbox = useCallback((image: string, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
    setIsTransitioning(false);
    
    const img = document.createElement('img');
    img.onload = () => {
      const size = calculateImageSize(img as HTMLImageElement);
      setImageSize(size);
    };
    img.src = image;
  }, [calculateImageSize]);

  const closeLightbox = useCallback(() => {
    setSelectedImage(null);
    setCurrentIndex(0);
    setImageSize({ width: 'auto', height: 'auto' });
    setIsTransitioning(false);
  }, []);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex <= 0 || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      const newIndex = currentIndex - 1;
      const newImage = images[newIndex];
      setCurrentIndex(newIndex);
      setSelectedImage(newImage);
      
      const img = document.createElement('img');
      img.onload = () => {
        const size = calculateImageSize(img as HTMLImageElement);
        setImageSize(size);
        setTimeout(() => setIsTransitioning(false), 50);
      };
      img.src = newImage;
    }, 200);
  }, [currentIndex, images, calculateImageSize, isTransitioning]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex >= images.length - 1 || isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      const newIndex = currentIndex + 1;
      const newImage = images[newIndex];
      setCurrentIndex(newIndex);
      setSelectedImage(newImage);
      
      const img = document.createElement('img');
      img.onload = () => {
        const size = calculateImageSize(img as HTMLImageElement);
        setImageSize(size);
        setTimeout(() => setIsTransitioning(false), 50);
      };
      img.src = newImage;
    }, 200);
  }, [currentIndex, images, calculateImageSize, isTransitioning]);

  const showMoreImages = useCallback(() => {
    const newVisibleCount = Math.min(visibleCount + 6, images.length);
    setVisibleCount(newVisibleCount);
    
    // 새로 보여질 이미지들의 로딩 상태 즉시 업데이트
    const newlyVisibleImages = images.slice(visibleCount, newVisibleCount);
    newlyVisibleImages.forEach(imageSrc => {
      if (preloadedImages.has(imageSrc)) {
        setLoadedImages(prev => new Set([...prev, imageSrc]));
      }
    });
  }, [images, visibleCount, preloadedImages]);

  const showLessImages = useCallback(() => {
    setVisibleCount(6);
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeLightbox();
    }
  }, [closeLightbox]);

  const handleImageLoad = useCallback((imageSrc: string) => {
    setLoadedImages(prev => new Set([...prev, imageSrc]));
  }, []);

  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    const handleResize = () => {
      const img = document.createElement('img');
      img.onload = () => {
        const size = calculateImageSize(img as HTMLImageElement);
        setImageSize(size);
      };
      img.src = selectedImage;
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    document.body.classList.add('no-scroll');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('no-scroll');
    };
  }, [selectedImage, closeLightbox, calculateImageSize, goToPrevious, goToNext]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  const popupContent = selectedImage && mounted ? (
    <div className={styles.popup} onClick={handleBackgroundClick}>
          <div className={styles.popupContent}>
            <button className={styles.closeButton} onClick={closeLightbox}>
              ✕
            </button>
            
            <div className={styles.popupImageWrapper}>
              <Image
                src={selectedImage}
                alt="확대된 이미지"
                fill
                sizes="100vw"
                quality={85}
                priority
                className={styles.popupImage}
                style={{
                  objectFit: 'contain',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              />
            </div>
            
            <div className={styles.navigationBar}>
              <button 
                className={`${styles.navArrow} ${styles.prevArrow}`}
                onClick={goToPrevious}
                disabled={isTransitioning || currentIndex <= 0}
              >
                ‹
              </button>
              
              <span className={styles.imageCounter}>
                {currentIndex + 1} / {images.length}
              </span>
              
              <button 
                className={`${styles.navArrow} ${styles.nextArrow}`}
                onClick={goToNext}
                disabled={isTransitioning || currentIndex >= images.length - 1}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      ) : null;

  return (
    <>
      <section className={styles.container}>
        <h2 className={styles.title}>소중한 순간들</h2>
        <div className={styles.grid}>
          {displayImages.map((image, index) => (
            <div
              key={index}
              className={styles.imageWrapper}
              onClick={() => openLightbox(image, index)}
            >
              <Image
                src={image}
                alt={`Wedding ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                quality={70}
                className={styles.image}
                onLoad={() => handleImageLoad(image)}
                style={{ 
                  objectFit: 'cover',
                  opacity: (loadedImages.has(image) || preloadedImages.has(image)) ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  cursor: 'pointer'
                }}
              />
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
              <button 
                className={styles.moreButton} 
                onClick={showMoreImages}
              >
                더보기 ({remainingCount}장)
              </button>
            )}
            
            {visibleCount > 6 && (
              <button 
                className={styles.lessButton} 
                onClick={showLessImages}
              >
                접기
              </button>
            )}
          </div>
        )}
      </section>

      {mounted && popupContent && createPortal(popupContent, document.body)}
    </>
  );
}
