import { getPageImages, type UploadedImage } from '@/services/imageService';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function findStorageMainImage(images: UploadedImage[]) {
  return images.find((image) => {
    const fileName = image.name.toLowerCase();
    return fileName.startsWith('main.') || fileName.includes('main.');
  });
}

function findStorageGalleryImages(images: UploadedImage[]) {
  return images
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
    });
}

export async function applyWizardStorageImageFallback(
  editableConfig: EditableInvitationPageConfig
) {
  const hasConfiguredCoverImage = hasText(editableConfig.config.metadata.images.wedding);
  const hasConfiguredGalleryImages = (editableConfig.config.pageData?.galleryImages ?? []).some(
    (imageUrl) => hasText(imageUrl)
  );

  if (hasConfiguredCoverImage && hasConfiguredGalleryImages) {
    return editableConfig;
  }

  const storageImages = await getPageImages(editableConfig.slug);
  if (storageImages.length === 0) {
    return editableConfig;
  }

  const mainImage = findStorageMainImage(storageImages);
  const galleryImages = findStorageGalleryImages(storageImages)
    .map((image) => image.url)
    .filter((imageUrl) => hasText(imageUrl));

  let changed = false;
  const nextConfig = {
    ...editableConfig.config,
    metadata: {
      ...editableConfig.config.metadata,
      images: {
        ...editableConfig.config.metadata.images,
      },
    },
    pageData: {
      ...(editableConfig.config.pageData ?? {}),
      galleryImages: [...(editableConfig.config.pageData?.galleryImages ?? [])],
    },
  };

  if (!hasConfiguredCoverImage && hasText(mainImage?.url)) {
    nextConfig.metadata.images.wedding = mainImage!.url;
    changed = true;
  }

  if (!hasConfiguredGalleryImages && galleryImages.length > 0) {
    nextConfig.pageData.galleryImages = galleryImages;
    changed = true;
  }

  if (!changed) {
    return editableConfig;
  }

  return {
    ...editableConfig,
    config: nextConfig,
  };
}
