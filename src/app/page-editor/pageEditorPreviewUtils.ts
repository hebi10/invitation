import { createInvitationPageFromSeed } from '@/config/weddingPages';
import { buildInvitationVariants } from '@/lib/invitationVariants';
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
  const previewSeed: InvitationPageSeed = {
    ...formState,
    slug,
    variants: buildInvitationVariants(slug, formState.displayName),
    pageData: {
      ...formState.pageData,
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
  return page.metadata.images.wedding ? [page.metadata.images.wedding] : [];
}
