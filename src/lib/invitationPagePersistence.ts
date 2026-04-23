import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
  normalizeInvitationMusicSelection,
} from '@/lib/musicLibrary';
import {
  isRecord,
  normalizeInvitationTheme,
  readNumber,
  readString,
  toDate,
} from '@/lib/invitationPageNormalization';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import { DEFAULT_EVENT_TYPE, normalizeEventTypeKey } from '@/lib/eventTypes';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  INVITATION_VARIANT_KEYS,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import type {
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';

const PAGE_SLUG_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const PAGE_SLUG_SUFFIX_LENGTH = 3;

export interface InvitationPageDisplayPeriodRecord {
  docId: string;
  pageSlug: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface InvitationPageRegistryRecord {
  docId: string;
  pageSlug: string;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  hasCustomConfig: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (typeof value !== 'object') {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const nextObject: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, entryValue]) => {
    if (entryValue === undefined) {
      return;
    }

    nextObject[key] = stripUndefinedDeep(entryValue);
  });

  return nextObject as T;
}

export function normalizeInvitationPageSlugInput(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export { normalizeInvitationPageSlugBase } from '@/lib/invitationPageSlug';

export function generateInvitationPageSlugSuffix(length = PAGE_SLUG_SUFFIX_LENGTH) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * PAGE_SLUG_SUFFIX_ALPHABET.length);
    return PAGE_SLUG_SUFFIX_ALPHABET[index];
  }).join('');
}

export function createInvitationPageDisplayName(groomName: string, brideName: string) {
  return `${groomName} · ${brideName}`;
}

export function normalizeInvitationPageDisplayPeriod(
  docId: string,
  data: Record<string, any>
): InvitationPageDisplayPeriodRecord | null {
  const pageSlug =
    typeof data.pageSlug === 'string' && data.pageSlug.trim()
      ? data.pageSlug.trim()
      : docId;

  if (!pageSlug) {
    return null;
  }

  return {
    docId,
    pageSlug,
    isActive: data.isActive === true,
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function normalizeInvitationPageRegistryRecord(
  docId: string,
  data: Record<string, any>
): InvitationPageRegistryRecord | null {
  const pageSlug =
    typeof data.pageSlug === 'string' && data.pageSlug.trim()
      ? data.pageSlug.trim()
      : docId;

  if (!pageSlug) {
    return null;
  }

  return {
    docId,
    pageSlug,
    published: data.published !== false,
    defaultTheme: normalizeInvitationTheme(data.defaultTheme),
    hasCustomConfig: data.hasCustomConfig === true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export function mergeInvitationPageSeed(
  base: InvitationPageSeed | undefined,
  candidate: Record<string, any>,
  fallbackSlug?: string,
  options: {
    fallbackTheme?: InvitationThemeKey;
    collapseLegacyAllTrue?: boolean;
  } = {}
): InvitationPageSeed | null {
  const coupleInput = isRecord(candidate.couple) ? candidate.couple : {};
  const groomInput = isRecord(coupleInput.groom) ? coupleInput.groom : {};
  const brideInput = isRecord(coupleInput.bride) ? coupleInput.bride : {};

  const metadataInput = isRecord(candidate.metadata) ? candidate.metadata : {};
  const metadataImagesInput = isRecord(metadataInput.images) ? metadataInput.images : {};
  const metadataOpenGraphInput = isRecord(metadataInput.openGraph)
    ? metadataInput.openGraph
    : {};
  const metadataTwitterInput = isRecord(metadataInput.twitter)
    ? metadataInput.twitter
    : {};

  const weddingDateTimeInput = isRecord(candidate.weddingDateTime)
    ? candidate.weddingDateTime
    : {};
  const variantsInput = isRecord(candidate.variants) ? candidate.variants : {};
  const pageDataInput = isRecord(candidate.pageData) ? candidate.pageData : undefined;
  const pageDataKakaoMapInput =
    pageDataInput && isRecord(pageDataInput.kakaoMap) ? pageDataInput.kakaoMap : {};
  const pageDataGiftInfoInput =
    pageDataInput && isRecord(pageDataInput.giftInfo) ? pageDataInput.giftInfo : {};

  const slug = readString(candidate.slug, base?.slug ?? fallbackSlug ?? '').trim();
  const displayName = readString(candidate.displayName, base?.displayName ?? '').trim();
  const description = readString(candidate.description, base?.description ?? '').trim();
  const date = readString(candidate.date, base?.date ?? '').trim();
  const venue = readString(candidate.venue, base?.venue ?? '').trim();

  const groom = {
    ...(base?.couple.groom ?? {}),
    ...groomInput,
    name: readString(groomInput.name, base?.couple.groom.name ?? '').trim(),
  };

  const bride = {
    ...(base?.couple.bride ?? {}),
    ...brideInput,
    name: readString(brideInput.name, base?.couple.bride.name ?? '').trim(),
  };

  const metadata = {
    ...(base?.metadata ?? {}),
    ...metadataInput,
    title: readString(metadataInput.title, base?.metadata.title ?? '').trim(),
    description: readString(
      metadataInput.description,
      base?.metadata.description ?? description
    ).trim(),
    keywords: Array.isArray(metadataInput.keywords)
      ? metadataInput.keywords.filter((value): value is string => typeof value === 'string')
      : base?.metadata.keywords ?? [],
    images: {
      ...(base?.metadata.images ?? {}),
      ...metadataImagesInput,
      wedding: readString(
        metadataImagesInput.wedding,
        base?.metadata.images.wedding ?? ''
      ),
      favicon: readString(
        metadataImagesInput.favicon,
        base?.metadata.images.favicon ?? ''
      ),
    },
    openGraph: {
      ...(base?.metadata.openGraph ?? {}),
      ...metadataOpenGraphInput,
      title: readString(
        metadataOpenGraphInput.title,
        base?.metadata.openGraph.title ?? ''
      ),
      description: readString(
        metadataOpenGraphInput.description,
        base?.metadata.openGraph.description ?? description
      ),
    },
    twitter: {
      ...(base?.metadata.twitter ?? {}),
      ...metadataTwitterInput,
      title: readString(
        metadataTwitterInput.title,
        base?.metadata.twitter.title ?? ''
      ),
      description: readString(
        metadataTwitterInput.description,
        base?.metadata.twitter.description ?? description
      ),
    },
  };

  const pageData = pageDataInput
    ? {
        ...(base?.pageData ?? {}),
        ...pageDataInput,
        galleryImages: Array.isArray(pageDataInput.galleryImages)
          ? pageDataInput.galleryImages.filter(
              (value): value is string => typeof value === 'string'
            )
          : base?.pageData?.galleryImages,
        kakaoMap: pageDataInput.kakaoMap
          ? {
              ...(base?.pageData?.kakaoMap ?? {}),
              ...pageDataKakaoMapInput,
              latitude: readNumber(
                pageDataKakaoMapInput.latitude,
                base?.pageData?.kakaoMap?.latitude ?? 0
              ),
              longitude: readNumber(
                pageDataKakaoMapInput.longitude,
                base?.pageData?.kakaoMap?.longitude ?? 0
              ),
            }
          : base?.pageData?.kakaoMap,
        venueGuide: Array.isArray(pageDataInput.venueGuide)
          ? pageDataInput.venueGuide
          : base?.pageData?.venueGuide,
        wreathGuide: Array.isArray(pageDataInput.wreathGuide)
          ? pageDataInput.wreathGuide
          : base?.pageData?.wreathGuide,
        giftInfo: pageDataInput.giftInfo
          ? {
              ...(base?.pageData?.giftInfo ?? {}),
              ...pageDataGiftInfoInput,
              groomAccounts: Array.isArray(pageDataGiftInfoInput.groomAccounts)
                ? pageDataGiftInfoInput.groomAccounts
                : base?.pageData?.giftInfo?.groomAccounts,
              brideAccounts: Array.isArray(pageDataGiftInfoInput.brideAccounts)
                ? pageDataGiftInfoInput.brideAccounts
                : base?.pageData?.giftInfo?.brideAccounts,
            }
          : base?.pageData?.giftInfo,
      }
    : base?.pageData;
  const existingMusicStoragePath = readString(base?.musicStoragePath, '').trim();
  const normalizedMusicSelection = normalizeInvitationMusicSelection({
    categoryId: readString(candidate.musicCategoryId, base?.musicCategoryId ?? '').trim(),
    trackId: readString(candidate.musicTrackId, base?.musicTrackId ?? '').trim(),
    storagePath: readString(candidate.musicStoragePath, existingMusicStoragePath).trim(),
  });
  const hasExplicitMusicUrl = typeof candidate.musicUrl === 'string';
  const hasStoragePathChanged =
    normalizedMusicSelection.musicStoragePath !== existingMusicStoragePath;
  const musicUrl = readString(
    candidate.musicUrl,
    hasStoragePathChanged && !hasExplicitMusicUrl ? '' : base?.musicUrl ?? ''
  ).trim();
  const featuresInput = isRecord(candidate.features) ? candidate.features : {};
  const productTier = normalizeInvitationProductTier(
    candidate.productTier,
    base?.productTier ?? DEFAULT_INVITATION_PRODUCT_TIER
  );
  const features = resolveInvitationFeatures(productTier, {
    maxGalleryImages:
      typeof featuresInput.maxGalleryImages === 'number' &&
      Number.isFinite(featuresInput.maxGalleryImages)
        ? featuresInput.maxGalleryImages
        : undefined,
    shareMode: featuresInput.shareMode,
    showMusic:
      typeof featuresInput.showMusic === 'boolean'
        ? featuresInput.showMusic
        : undefined,
    showCountdown:
      typeof featuresInput.showCountdown === 'boolean'
        ? featuresInput.showCountdown
        : undefined,
    showGuestbook:
      typeof featuresInput.showGuestbook === 'boolean'
        ? featuresInput.showGuestbook
        : undefined,
  });

  const sourceVariants = { ...(base?.variants ?? {}), ...variantsInput };
  const sourceAvailableVariantKeys = getAvailableInvitationVariantKeys(
    sourceVariants as InvitationPageSeed['variants']
  );
  const fallbackTheme = normalizeInvitationTheme(
    options.fallbackTheme,
    sourceAvailableVariantKeys[0] ?? DEFAULT_INVITATION_THEME
  );
  const hasFullTrueAvailability =
    sourceAvailableVariantKeys.length === INVITATION_VARIANT_KEYS.length &&
    INVITATION_VARIANT_KEYS.every((key) => {
      const variant = sourceVariants[key];
      return isRecord(variant) && variant.available === true;
    });
  const shouldCollapseFullTrueAvailability =
    hasFullTrueAvailability && options.collapseLegacyAllTrue === true;
  const supportedVariants = buildInvitationVariants(slug, displayName, {
    availability: createInvitationVariantAvailability([
      fallbackTheme as InvitationVariantKey,
    ]),
  });

  const normalizedVariants = INVITATION_VARIANT_KEYS.reduce<InvitationPageSeed['variants']>(
    (variants, variantKey) => {
      const builtVariant = supportedVariants[variantKey];
      if (!builtVariant) {
        return variants;
      }

      const sourceVariant = sourceVariants[variantKey];
      const available = shouldCollapseFullTrueAvailability
        ? variantKey === fallbackTheme
        : isRecord(sourceVariant) && typeof sourceVariant.available === 'boolean'
          ? sourceVariant.available
          : builtVariant.available;

      if (!isRecord(sourceVariant) && !available) {
        return variants;
      }

      variants[variantKey] = {
        ...builtVariant,
        ...(isRecord(sourceVariant) ? sourceVariant : {}),
        available,
        path: builtVariant.path,
        displayName: readString(
          isRecord(sourceVariant) ? sourceVariant.displayName : undefined,
          builtVariant.displayName
        ),
      };

      return variants;
    },
    {}
  );

  if (getAvailableInvitationVariantKeys(normalizedVariants).length === 0) {
    const fallbackVariant = supportedVariants[fallbackTheme];
    if (fallbackVariant) {
      const sourceVariant = sourceVariants[fallbackTheme];
      normalizedVariants[fallbackTheme] = {
        ...fallbackVariant,
        ...(isRecord(sourceVariant) ? sourceVariant : {}),
        available: true,
        path: fallbackVariant.path,
        displayName: readString(
          isRecord(sourceVariant) ? sourceVariant.displayName : undefined,
          fallbackVariant.displayName
        ),
      };
    }
  }

  const normalizedSeed: InvitationPageSeed = {
    ...(base ?? {}),
    eventType: normalizeEventTypeKey(candidate.eventType, base?.eventType ?? DEFAULT_EVENT_TYPE),
    slug,
    displayName,
    description,
    date,
    venue,
    productTier,
    features,
    musicEnabled:
      typeof candidate.musicEnabled === 'boolean'
        ? candidate.musicEnabled
        : base?.musicEnabled ?? false,
    musicVolume: clampInvitationMusicVolume(
      candidate.musicVolume,
      base?.musicVolume ?? DEFAULT_INVITATION_MUSIC_VOLUME
    ),
    musicCategoryId: normalizedMusicSelection.musicCategoryId,
    musicTrackId: normalizedMusicSelection.musicTrackId,
    musicStoragePath: normalizedMusicSelection.musicStoragePath,
    musicUrl,
    groomName: readString(candidate.groomName, groom.name).trim(),
    brideName: readString(candidate.brideName, bride.name).trim(),
    couple: {
      groom,
      bride,
    },
    weddingDateTime: {
      year: readNumber(weddingDateTimeInput.year, base?.weddingDateTime.year ?? 0),
      month: readNumber(weddingDateTimeInput.month, base?.weddingDateTime.month ?? 0),
      day: readNumber(weddingDateTimeInput.day, base?.weddingDateTime.day ?? 0),
      hour: readNumber(weddingDateTimeInput.hour, base?.weddingDateTime.hour ?? 0),
      minute: readNumber(
        weddingDateTimeInput.minute,
        base?.weddingDateTime.minute ?? 0
      ),
    },
    metadata,
    pageData,
    variants: normalizedVariants,
  };

  if (
    !normalizedSeed.slug ||
    !normalizedSeed.couple.groom.name ||
    !normalizedSeed.couple.bride.name ||
    !normalizedSeed.metadata.images.favicon ||
    getAvailableInvitationVariantKeys(normalizedSeed.variants).length === 0
  ) {
    return null;
  }

  return normalizedSeed;
}

export function normalizeInvitationConfigSeed(
  docId: string,
  data: Record<string, any>,
  fallbackSeed?: InvitationPageSeed
) {
  return mergeInvitationPageSeed(fallbackSeed, data, docId, {
    fallbackTheme: normalizeInvitationTheme(data.defaultTheme),
  });
}
