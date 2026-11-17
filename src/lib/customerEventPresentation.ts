import type { InvitationPageSeed } from '@/types/invitationPage';
import { formatWeddingDateTimeLabel, isValidWeddingDateTime } from '../contracts/weddingDateTime';

export interface CustomerEventPresentation {
  coverImageUrl: string | null;
  eventDateLabel: string | null;
}

export function normalizeCustomerEventCoverImageUrl(value: unknown): string | null {
  const imageUrl = typeof value === 'string' ? value.trim() : '';
  if (!imageUrl || /[\u0000-\u001f\u007f\\]/.test(imageUrl)) {
    return null;
  }

  // Saved invitation images use either site-local assets or HTTP(S) storage URLs.
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function getEventDateLabel(config: InvitationPageSeed | null | undefined) {
  const date = config?.weddingDateTime;
  if (!isValidWeddingDateTime(date)) return null;

  return formatWeddingDateTimeLabel(date, !config?.eventType || config.eventType === 'wedding');
}

export function getCustomerEventPresentation(
  config: InvitationPageSeed | null | undefined
): CustomerEventPresentation {
  return {
    coverImageUrl:
      normalizeCustomerEventCoverImageUrl(config?.pageData?.coverImageThumbnailUrl) ??
      normalizeCustomerEventCoverImageUrl(config?.metadata?.images?.wedding),
    eventDateLabel: getEventDateLabel(config),
  };
}
