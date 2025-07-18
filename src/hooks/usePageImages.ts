'use client';

import { useState, useEffect } from 'react';
import { getPageImages, UploadedImage } from '@/services/imageService';

export function usePageImages(pageSlug: string) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedImages = await getPageImages(pageSlug);
        setImages(fetchedImages);
      } catch (err) {
        console.error('이미지 로드 실패:', err);
        setError('이미지를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (pageSlug) {
      loadImages();
    }
  }, [pageSlug]);

  return {
    images,
    loading,
    error,
    // 편의 함수들
    firstImage: images[0] || null,
    imageUrls: images.map(img => img.url),
    getImageByName: (name: string) => images.find(img => img.name.includes(name)),
    hasImages: images.length > 0,
    
    // 특정 이름 패턴의 이미지들
    mainImage: images.find(img => {
      const fileName = img.name.toLowerCase();
      return fileName.startsWith('main.') || fileName.includes('main.');
    }),
    galleryImages: images.filter(img => {
      const fileName = img.name.toLowerCase();
      return fileName.startsWith('gallery') || fileName.includes('gallery');
    }).sort((a, b) => {
      // gallery01, gallery02... 순으로 정렬
      const aMatch = a.name.match(/gallery(\d+)/i);
      const bMatch = b.name.match(/gallery(\d+)/i);
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      }
      return a.name.localeCompare(b.name);
    })
  };
}
