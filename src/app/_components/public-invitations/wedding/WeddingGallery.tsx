'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import type { InvitationThemeKey } from '@/lib/invitationThemes';

import galleryStyles from './WeddingGallery.module.css';

interface WeddingGalleryProps {
  theme: InvitationThemeKey;
  images: string[];
  previewImages?: string[];
  imageAltPrefix: string;
  styles: Record<string, string>;
}

const gridThemeClasses: Partial<Record<InvitationThemeKey, string>> = {
  'classic-r': galleryStyles.editorial,
  romantic: galleryStyles.album,
  emotional: galleryStyles.natural,
};

export default function WeddingGallery({
  theme,
  images,
  previewImages,
  imageAltPrefix,
  styles,
}: WeddingGalleryProps) {
  const gridThemeClass = gridThemeClasses[theme];
  const usesGrid = theme === 'classic-r' || theme === 'romantic' || theme === 'emotional';

  return (
    <GalleryGridShared
      images={images}
      previewImages={previewImages}
      imageAltPrefix={imageAltPrefix}
      title="사진"
      gridOverview={theme === 'emotional'}
      editorialOverview={theme === 'romantic'}
      layout={usesGrid ? 'grid' : 'carousel'}
      swiperVariant={usesGrid ? undefined : theme === 'gyeol' ? 'gyeol' : 'simple'}
      styles={usesGrid ? {
        ...styles,
        container: [styles.container, galleryStyles.gallery, gridThemeClass].filter(Boolean).join(' '),
        imageGrid: galleryStyles.imageGrid,
        imageWrapper: galleryStyles.imageWrapper,
        imageContainer: [styles.imageContainer, galleryStyles.imageContainer].filter(Boolean).join(' '),
        overviewCard: galleryStyles.overviewCard,
        overviewCount: galleryStyles.overviewCount,
        storyCaption: galleryStyles.storyCaption,
        photoUnavailable: galleryStyles.photoUnavailable,
      } : styles}
    />
  );
}
