import { getPageImages, type UploadedImage } from '@/services/imageService';
import type { EditableInvitationPageConfig } from '@/services/invitationPageService';

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function didImageListChange(previous: string[], next: string[]) {
  if (previous.length !== next.length) {
    return true;
  }

  return previous.some((value, index) => value !== next[index]);
}

function isManagedInvitationImageUrl(imageUrl: string | undefined | null, pageSlug: string) {
  const normalizedUrl = imageUrl?.trim();
  if (!normalizedUrl) {
    return false;
  }

  const encodedSlug = encodeURIComponent(pageSlug);

  return (
    normalizedUrl.includes(`wedding-images/${pageSlug}/`) ||
    normalizedUrl.includes(`wedding-images%2F${pageSlug}%2F`) ||
    normalizedUrl.includes(`wedding-images%2F${encodedSlug}%2F`) ||
    normalizedUrl.includes(`/${pageSlug}/main`) ||
    normalizedUrl.includes(`/${pageSlug}/gallery`) ||
    normalizedUrl.includes(`%2F${encodedSlug}%2Fmain`) ||
    normalizedUrl.includes(`%2F${encodedSlug}%2Fgallery`)
  );
}

function collectStorageImageUrls(images: UploadedImage[]) {
  const urls = new Set<string>();

  images.forEach((image) => {
    if (hasText(image.url)) {
      urls.add(image.url.trim());
    }

    if (hasText(image.thumbnailUrl)) {
      urls.add(image.thumbnailUrl!.trim());
    }
  });

  return urls;
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
  const configuredCoverImage = editableConfig.config.metadata.images.wedding?.trim() ?? '';
  const configuredSocialPreviewImage =
    editableConfig.config.metadata.images.social?.trim() ?? '';
  const configuredKakaoCardImage =
    editableConfig.config.metadata.images.kakaoCard?.trim() ?? '';
  const configuredGalleryImages = (editableConfig.config.pageData?.galleryImages ?? []).filter(
    (imageUrl) => hasText(imageUrl)
  );
  const storageImages = await getPageImages(editableConfig.slug);

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
      galleryImages: [...configuredGalleryImages],
    },
  };

  let nextCoverImage = configuredCoverImage;
  let nextSocialPreviewImage = configuredSocialPreviewImage;
  let nextKakaoCardImage = configuredKakaoCardImage;
  let nextGalleryImages = [...configuredGalleryImages];
  let changed = false;

  if (storageImages.length === 0) {
    if (
      hasText(nextCoverImage) &&
      isManagedInvitationImageUrl(nextCoverImage, editableConfig.slug)
    ) {
      nextCoverImage = '';
      changed = true;
    }

    if (
      hasText(nextSocialPreviewImage) &&
      isManagedInvitationImageUrl(nextSocialPreviewImage, editableConfig.slug)
    ) {
      nextSocialPreviewImage = '';
      changed = true;
    }

    if (
      hasText(nextKakaoCardImage) &&
      isManagedInvitationImageUrl(nextKakaoCardImage, editableConfig.slug)
    ) {
      nextKakaoCardImage = '';
      changed = true;
    }

    const filteredGalleryImages = nextGalleryImages.filter(
      (imageUrl) => !isManagedInvitationImageUrl(imageUrl, editableConfig.slug)
    );

    if (didImageListChange(nextGalleryImages, filteredGalleryImages)) {
      nextGalleryImages = filteredGalleryImages;
      changed = true;
    }

    if (!hasText(nextCoverImage) && nextGalleryImages.length > 0) {
      nextCoverImage = nextGalleryImages[0];
      changed = true;
    }

    if (!changed) {
      return editableConfig;
    }

    nextConfig.metadata.images.wedding = nextCoverImage;
    nextConfig.metadata.images.social = nextSocialPreviewImage;
    nextConfig.metadata.images.kakaoCard = nextKakaoCardImage;
    nextConfig.pageData.galleryImages = nextGalleryImages;

    return {
      ...editableConfig,
      config: nextConfig,
    };
  }

  const managedImageUrls = collectStorageImageUrls(storageImages);
  const mainImage = findStorageMainImage(storageImages);
  const storageGalleryImages = findStorageGalleryImages(storageImages)
    .map((image) => image.url)
    .filter((imageUrl) => hasText(imageUrl));

  if (
    hasText(nextCoverImage) &&
    isManagedInvitationImageUrl(nextCoverImage, editableConfig.slug) &&
    !managedImageUrls.has(nextCoverImage)
  ) {
    nextCoverImage = '';
    changed = true;
  }

  if (
    hasText(nextSocialPreviewImage) &&
    isManagedInvitationImageUrl(nextSocialPreviewImage, editableConfig.slug) &&
    !managedImageUrls.has(nextSocialPreviewImage)
  ) {
    nextSocialPreviewImage = '';
    changed = true;
  }

  if (
    hasText(nextKakaoCardImage) &&
    isManagedInvitationImageUrl(nextKakaoCardImage, editableConfig.slug) &&
    !managedImageUrls.has(nextKakaoCardImage)
  ) {
    nextKakaoCardImage = '';
    changed = true;
  }

  const filteredGalleryImages = nextGalleryImages.filter((imageUrl) => {
    if (!isManagedInvitationImageUrl(imageUrl, editableConfig.slug)) {
      return true;
    }

    return managedImageUrls.has(imageUrl);
  });

  if (didImageListChange(nextGalleryImages, filteredGalleryImages)) {
    nextGalleryImages = filteredGalleryImages;
    changed = true;
  }

  if (!hasText(nextCoverImage)) {
    const fallbackCoverImage =
      (hasText(mainImage?.url) ? mainImage!.url : undefined) ??
      nextGalleryImages[0] ??
      storageGalleryImages[0] ??
      '';

    if (hasText(fallbackCoverImage)) {
      nextCoverImage = fallbackCoverImage;
      changed = true;
    }
  }

  if (nextGalleryImages.length === 0 && storageGalleryImages.length > 0) {
    nextGalleryImages = storageGalleryImages;
    changed = true;
  }

  if (!changed) {
    return editableConfig;
  }

  nextConfig.metadata.images.wedding = nextCoverImage;
  nextConfig.metadata.images.social = nextSocialPreviewImage;
  nextConfig.metadata.images.kakaoCard = nextKakaoCardImage;
  nextConfig.pageData.galleryImages = nextGalleryImages;

  return {
    ...editableConfig,
    config: nextConfig,
  };
}
