'use client';

import GalleryGridShared from '@/components/sections/Gallery/GalleryGridShared';
import type { WeddingGalleryVariant } from '@/components/sections/Gallery/WeddingGallerySwiper';
import type { InvitationThemeKey } from '@/lib/invitationThemes';

interface WeddingGalleryProps {
  theme: InvitationThemeKey;
  images: string[];
  previewImages?: string[];
  overviewIndices?: number[];
  imageAltPrefix: string;
  styles: Record<string, string>;
}

const sliderThemes: ReadonlySet<string> = new Set([
  'simple', 'classic-r', 'romantic', 'gyeol', 'emotional',
]);

export default function WeddingGallery({
  theme,
  images,
  previewImages,
  imageAltPrefix,
  styles,
}: WeddingGalleryProps) {
  const variant: WeddingGalleryVariant = sliderThemes.has(theme)
    ? theme as WeddingGalleryVariant
    : 'simple';

  return (
    <GalleryGridShared
      images={images}
      previewImages={previewImages}
      imageAltPrefix={imageAltPrefix}
      title="사진"
      layout="carousel"
      swiperVariant={variant}
      styles={styles}
    />
  );
}
