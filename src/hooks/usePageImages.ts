'use client';

import { useEffect, useState } from 'react';
import { getPageImages, type UploadedImage } from '@/services/imageService';
import { preloadImages } from '@/utils/imageOptimization';

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

        if (fetchedImages.length > 0) {
          const mainImage = fetchedImages.find((image) => {
            const fileName = image.name.toLowerCase();
            return fileName.startsWith('main.') || fileName.includes('main.');
          });

          const firstGalleryImages = fetchedImages
            .filter((image) => {
              const fileName = image.name.toLowerCase();
              return fileName.startsWith('gallery') || fileName.includes('gallery');
            })
            .slice(0, 2);

          const preloadTargets = [
            ...(mainImage ? [mainImage.url] : []),
            ...firstGalleryImages.map((image) => image.url),
          ];

          const runPreload = () => {
            preloadImages(preloadTargets).catch((preloadError) => {
              console.warn('이미지 프리로드 실패:', preloadError);
            });
          };

          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(runPreload);
          } else {
            globalThis.setTimeout(runPreload, 120);
          }
        }
      } catch (loadError) {
        console.error('이미지 로드 실패:', loadError);
        setError('이미지를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (pageSlug) {
      void loadImages();
    }
  }, [pageSlug]);

  return {
    images,
    loading,
    error,
    firstImage: images[0] || null,
    imageUrls: images.map((image) => image.url),
    getImageByName: (name: string) => images.find((image) => image.name.includes(name)),
    hasImages: images.length > 0,
    mainImage: images.find((image) => {
      const fileName = image.name.toLowerCase();
      return fileName.startsWith('main.') || fileName.includes('main.');
    }),
    galleryImages: images
      .filter((image) => {
        const fileName = image.name.toLowerCase();
        return fileName.startsWith('gallery') || fileName.includes('gallery');
      })
      .sort((left, right) => {
        const leftMatch = left.name.match(/gallery(\d+)/i);
        const rightMatch = right.name.match(/gallery(\d+)/i);

        if (leftMatch && rightMatch) {
          return parseInt(leftMatch[1], 10) - parseInt(rightMatch[1], 10);
        }

        return left.name.localeCompare(right.name);
      }),
  };
}
