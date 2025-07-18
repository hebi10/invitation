'use client';

import { useState, useEffect } from 'react';
import styles from './Gallery.module.css';

interface GalleryProps {
  images: string[];
  title?: string;
}

export default function Gallery({ images, title = "소중한 순간들" }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // galleryImages는 이미 필터링된 상태이므로 모든 이미지를 표시
  const displayImages = images;
  
  const openPopup = (image: string) => {
    setSelectedImage(image);
  };
  
  const closePopup = () => {
    setSelectedImage(null);
  };
  
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  };

  // ESC 키로 팝업 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        closePopup();
      }
    };

    if (selectedImage) {
      // 이벤트 리스너 등록
      document.addEventListener('keydown', handleKeyDown);
      
      // body 스크롤 방지 - CSS 클래스 사용
      document.body.classList.add('no-scroll');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('no-scroll');
    };
  }, [selectedImage]);

  // 컴포넌트 언마운트 시 정리
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
            <img 
              key={index} 
              className={styles.imageItem}
              src={image} 
              alt={`Gallery image ${index + 2}`}
              onClick={() => openPopup(image)}
            />
          ))}
        </div>
      </section>
      
      {/* 이미지 팝업 */}
      {selectedImage && (
        <div className={styles.popup} onClick={handleBackgroundClick}>
          <div className={styles.popupContent}>
            <button className={styles.closeButton} onClick={closePopup}>
              ✕
            </button>
            <img 
              src={selectedImage} 
              alt="확대 이미지" 
              className={styles.popupImage}
            />
          </div>
        </div>
      )}
    </>
  );
}
