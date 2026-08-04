import type { InvitationPageSeed } from '@/types/invitationPage';

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeSampleValue(storedValue: unknown, sampleValue: unknown): unknown {
  if (typeof storedValue === 'string') {
    return storedValue.trim() ? storedValue : sampleValue;
  }

  if (storedValue === undefined || storedValue === null) {
    return sampleValue;
  }

  if (Array.isArray(storedValue)) {
    return storedValue.length > 0 ? storedValue : sampleValue;
  }

  if (isPlainRecord(storedValue) && isPlainRecord(sampleValue)) {
    const keys = new Set([...Object.keys(sampleValue), ...Object.keys(storedValue)]);
    const merged: Record<string, unknown> = {};

    keys.forEach((key) => {
      merged[key] = mergeSampleValue(storedValue[key], sampleValue[key]);
    });

    return merged;
  }

  return storedValue;
}

function isValidWeddingDateTime(value: InvitationPageSeed['weddingDateTime']) {
  const { year, month, day, hour, minute } = value;
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    !Number.isInteger(month) ||
    month < 0 ||
    month > 11 ||
    !Number.isInteger(day) ||
    day < 1 ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return day <= daysInMonth;
}

function hasInvalidZeroCoordinates(page: InvitationPageSeed) {
  const kakaoMap = page.pageData?.kakaoMap;
  return kakaoMap?.latitude === 0 && kakaoMap.longitude === 0;
}

export function isUsableSampleWeddingImage(pageSlug: string, imageUrl: string) {
  const normalizedImageUrl = imageUrl.trim();
  if (!normalizedImageUrl) {
    return false;
  }

  if (normalizedImageUrl.startsWith('/images/')) {
    return true;
  }

  let decodedImageUrl = normalizedImageUrl;
  try {
    decodedImageUrl = decodeURIComponent(normalizedImageUrl);
  } catch {
    // Keep the original value when a non-URL custom image contains malformed escapes.
  }

  if (
    decodedImageUrl.includes('firebasestorage.googleapis.com') &&
    decodedImageUrl.includes('wedding-images/')
  ) {
    return decodedImageUrl.includes(`wedding-images/${pageSlug}/`);
  }

  return true;
}

export function mergeInvitationSampleFallback(
  stored: InvitationPageSeed,
  sample: InvitationPageSeed
): InvitationPageSeed {
  const merged = mergeSampleValue(stored, sample) as InvitationPageSeed;

  if (!isValidWeddingDateTime(stored.weddingDateTime)) {
    merged.weddingDateTime = { ...sample.weddingDateTime };
  }

  if (hasInvalidZeroCoordinates(stored) && sample.pageData?.kakaoMap) {
    merged.pageData = {
      ...merged.pageData,
      kakaoMap: { ...sample.pageData.kakaoMap },
    };
  }

  if (
    !isUsableSampleWeddingImage(
      sample.slug,
      stored.metadata.images.wedding
    )
  ) {
    merged.metadata = {
      ...merged.metadata,
      images: {
        ...merged.metadata.images,
        wedding: sample.metadata.images.wedding,
      },
    };
  }

  return merged;
}
