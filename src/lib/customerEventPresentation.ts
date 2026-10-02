import type { InvitationPageSeed } from '@/types/invitationPage';

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

function getEventDateLabel(date: InvitationPageSeed['weddingDateTime'] | undefined) {
  if (!date) {
    return null;
  }

  const { year, month, day, hour, minute } = date;
  if (
    !Number.isInteger(year) || year < 1900 || year > 9999 ||
    !Number.isInteger(month) || month < 0 || month > 11 ||
    !Number.isInteger(day) || day < 1 ||
    !Number.isInteger(hour) || hour < 0 || hour > 23 ||
    !Number.isInteger(minute) || minute < 0 || minute > 59
  ) {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return day <= daysInMonth ? `${year}. ${month + 1}. ${day}.` : null;
}

export function getCustomerEventPresentation(
  config: InvitationPageSeed | null | undefined
): CustomerEventPresentation {
  return {
    coverImageUrl:
      normalizeCustomerEventCoverImageUrl(config?.pageData?.coverImageThumbnailUrl) ??
      normalizeCustomerEventCoverImageUrl(config?.metadata?.images?.wedding),
    eventDateLabel: getEventDateLabel(config?.weddingDateTime),
  };
}
