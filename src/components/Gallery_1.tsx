'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './Gallery_1.module.css';

interface GalleryProps {
  images: string[];
  title?: string;
}

const Gallery_1 = React.memo(function Gallery_1({ images, title = "소중한 순간들" }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [imageSize, setImageSize] = useState({ width: 'auto', height: 'auto' });
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
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

  const openPopup = useCallback((image: string) => {
    setSelectedImage(image);
    
    const img = new Image();
    img.onload = () => {
      const size = calculateImageSize(img);
      setImageSize(size);
    };
    img.src = image;
  }, [calculateImageSize]);

  const closePopup = useCallback(() => {
    setSelectedImage(null);
    setImageSize({ width: 'auto', height: 'auto' });
  }, []);

  const showMoreImages = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + 6, images.length));
  }, [images.length]);

  const showLessImages = useCallback(() => {
    setVisibleCount(6);
  }, []);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  }, [closePopup]);

  const handleImageLoad = useCallback((imageSrc: string) => {
    setLoadedImages(prev => new Set([...prev, imageSrc]));
  }, []);

  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopup();
      }
    };

    const handleResize = () => {
      const img = new Image();
      img.onload = () => {
        const size = calculateImageSize(img);
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
  }, [selectedImage, closePopup, calculateImageSize]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  return (
    <>
      <section className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.imageGrid}>
          {displayImages.map((image, index) => (
            <div key={index} className={styles.imageWrapper}>
              <img 
                className={styles.imageItem}
                src={image} 
                alt={`Gallery image ${index + 1}`}
                onClick={() => openPopup(image)}
                onLoad={() => handleImageLoad(image)}
                loading="lazy"
                style={{
                  opacity: loadedImages.has(image) ? 1 : 0,
                  transition: 'opacity 0.3s ease'
                }}
              />
              {!loadedImages.has(image) && (
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
      
      {selectedImage && (
        <div className={styles.popup} onClick={handleBackgroundClick}>
          <div className={styles.popupContent}>
            <button className={styles.closeButton} onClick={closePopup}>
              ✕
            </button>
            <img 
              src={selectedImage} 
              alt="확대된 이미지"
              className={styles.popupImage}
              style={{
                width: imageSize.width,
                height: imageSize.height,
                maxWidth: 'calc(100vw - 40px) !important',
                maxHeight: 'calc(100vh - 40px) !important',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
});

export default Gallery_1;
