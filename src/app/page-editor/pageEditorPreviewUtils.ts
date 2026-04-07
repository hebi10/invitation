import { createInvitationPageFromSeed } from '@/config/weddingPages';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  resolveAvailableInvitationVariant,
} from '@/lib/invitationVariants';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { InvitationPage, InvitationPageSeed } from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

export type PreviewThemeKey = 'emotional' | 'simple';

function hasGuideContent(item: { title?: string; content?: string }) {
  return Boolean(item.title?.trim() || item.content?.trim());
}

function hasAccountContent(item: {
  bank?: string;
  accountNumber?: string;
  accountHolder?: string;
}) {
  return Boolean(
    item.bank?.trim() || item.accountNumber?.trim() || item.accountHolder?.trim()
  );
}

export function buildPreviewPage(
  slug: string,
  formState: InvitationPageSeed,
  published: boolean
): InvitationPage {
  const features = resolveInvitationFeatures(formState.productTier, formState.features);
  const availableVariantKeys = getAvailableInvitationVariantKeys(formState.variants);
  const fallbackVariant =
    resolveAvailableInvitationVariant(formState.variants, 'emotional') ?? 'emotional';
  const enabledVariantKeys =
    availableVariantKeys.length > 0 ? availableVariantKeys : [fallbackVariant];
  const previewSeed: InvitationPageSeed = {
    ...formState,
    slug,
    variants: buildInvitationVariants(slug, formState.displayName, {
      availability: createInvitationVariantAvailability(enabledVariantKeys),
    }),
    pageData: {
      ...formState.pageData,
      galleryImages: (formState.pageData?.galleryImages ?? [])
        .map((imageUrl) => imageUrl.trim())
        .filter(Boolean)
        .slice(0, features.maxGalleryImages),
      venueName: formState.pageData?.venueName || formState.venue,
      venueGuide: (formState.pageData?.venueGuide ?? []).filter(hasGuideContent),
      wreathGuide: (formState.pageData?.wreathGuide ?? []).filter(hasGuideContent),
      giftInfo: {
        ...formState.pageData?.giftInfo,
        groomAccounts: (formState.pageData?.giftInfo?.groomAccounts ?? []).filter(
          hasAccountContent
        ),
        brideAccounts: (formState.pageData?.giftInfo?.brideAccounts ?? []).filter(
          hasAccountContent
        ),
      },
    },
  };

  return sanitizeHeartIconPlaceholdersDeep(
    createInvitationPageFromSeed(previewSeed, {
      published,
      displayPeriodEnabled: false,
      displayPeriodStart: null,
      displayPeriodEnd: null,
    })
  );
}

export function buildWeddingDate(page: InvitationPage) {
  return new Date(
    page.weddingDateTime.year,
    page.weddingDateTime.month,
    page.weddingDateTime.day,
    page.weddingDateTime.hour,
    page.weddingDateTime.minute
  );
}

export function getPreviewImages(page: InvitationPage) {
  if (page.pageData?.galleryImages?.length) {
    const features = resolveInvitationFeatures(page.productTier, page.features);
    return page.pageData.galleryImages.slice(0, features.maxGalleryImages);
  }

  return page.metadata.images.wedding ? [page.metadata.images.wedding] : [];
}
