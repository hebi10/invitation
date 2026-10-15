import type { InvitationPageSeed } from '@/types/invitationPage';

import type { UploadFieldKind } from './pageWizardShared';

/** 라이브러리에서 명시적으로 선택한 사진만 현재 편집 초안에 반영합니다. */
export function applyWizardLibraryImageSelection(
  draft: InvitationPageSeed,
  kind: UploadFieldKind,
  imageUrl: string,
  maxGalleryImages: number
) {
  const url = imageUrl.trim();
  if (!url) return;

  if (kind === 'gallery') {
    const images = draft.pageData?.galleryImages ?? [];
    if (images.includes(url) || images.length >= maxGalleryImages) return;
    draft.pageData = { ...draft.pageData, galleryImages: [...images, url] };
    return;
  }

  const field = kind === 'cover' ? 'wedding' : kind === 'sharePreview' ? 'social' : 'kakaoCard';
  draft.metadata.images[field] = url;
}
