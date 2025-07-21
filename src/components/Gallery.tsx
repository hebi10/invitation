'use client';

import { useState, useEffect } from 'react';
import styles from './Gallery.module.css';

interface GalleryProps {
  images: string[];
  title?: string;
}

export default function Gallery({ images, title = "소중한 순간들" }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6); // 초기에 6장만 표시
  
  // 표시할 이미지들 (visibleCount만큼)
  const displayImages = images.slice(0, visibleCount);
  const hasMoreImages = images.length > visibleCount;
  const remainingCount = images.length - visibleCount;
  
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

  // 더보기 버튼 클릭 시 6장씩 추가
  const showMoreImages = () => {
    setVisibleCount(prev => Math.min(prev + 6, images.length));
  };

  // 접기 버튼 클릭 시 처음 6장으로 돌아가기
  const showLessImages = () => {
    setVisibleCount(6);
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
              alt={`Gallery image ${index + 1}`}
              onClick={() => openPopup(image)}
            />
          ))}
        </div>
        
        {/* 더보기/접기 버튼들 */}
        {images.length > 6 && (
          <div className={styles.buttonContainer}>
            {hasMoreImages && (
              <button 
                className={styles.moreButton} 
                onClick={showMoreImages}
              >
                <span className={styles.buttonIcon}>📷</span>
                더보기 ({remainingCount}장 더)
              </button>
            )}
            
            {visibleCount > 6 && (
              <button 
                className={styles.lessButton} 
                onClick={showLessImages}
              >
                <span className={styles.buttonIcon}>📁</span>
                접기
              </button>
            )}
          </div>
        )}
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
