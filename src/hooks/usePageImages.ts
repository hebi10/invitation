'use client';

import { useEffect, useState } from 'react';

import { getPageImages, type UploadedImage } from '@/services/imageService';

interface UsePageImagesOptions {
  enabled?: boolean;
  allowListing?: boolean;
}

export function usePageImages(pageSlug: string, options: UsePageImagesOptions = {}) {
  const enabled = options.enabled !== false;
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !pageSlug) {
      setImages([]);
      setLoading(false);
      setError(null);
      return;
    }

    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetchedImages = await getPageImages(pageSlug, {
          allowListing: options.allowListing !== false,
        });
        setImages(fetchedImages);
      } catch (loadError) {
        console.error('이미지 로드 실패:', loadError);
        setError('이미지를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    void loadImages();
  }, [enabled, options.allowListing, pageSlug]);

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
