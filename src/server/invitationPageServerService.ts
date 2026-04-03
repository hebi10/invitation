import 'server-only';

import { cache } from 'react';

import {
  createInvitationPageFromSeed,
  getWeddingPageBySlug,
  type WeddingPageConfig,
} from '@/config/weddingPages';
import { buildInvitationVariants } from '@/lib/invitationVariants';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type {
  InvitationPage,
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

import { getServerFirestore } from './firebaseAdmin';

type DisplayPeriodRecord = {
  docId: string;
  pageSlug: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type InvitationPageRegistryRecord = {
  docId: string;
  pageSlug: string;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  hasCustomConfig: boolean;
  editorTokenHash: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type BuiltInvitationPageRecord = {
  page: InvitationPage;
  dataSource: 'sample' | 'firestore';
  hasCustomConfig: boolean;
};

const DISPLAY_PERIOD_COLLECTION = 'display-periods';
const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeInvitationTheme(
  value: unknown,
  fallback: InvitationThemeKey = DEFAULT_INVITATION_THEME
): InvitationThemeKey {
  return value === 'simple' ? 'simple' : fallback;
}

function normalizePageSlugInput(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildSamplePage(pageSlug: string): InvitationPage | null {
  const sample = getWeddingPageBySlug(pageSlug);
  if (!sample) {
    return null;
  }

  return sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(sample));
}

function normalizeDisplayPeriod(
  docId: string,
  data: Record<string, any>
): DisplayPeriodRecord | null {
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

function normalizeRegistryRecord(
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
    editorTokenHash:
      typeof data.editorTokenHash === 'string' && data.editorTokenHash.trim()
        ? data.editorTokenHash.trim()
        : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mergeInvitationPageSeed(
  base: InvitationPageSeed | undefined,
  candidate: Record<string, any>,
  fallbackSlug?: string
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
    showCountdown:
      typeof featuresInput.showCountdown === 'boolean'
        ? featuresInput.showCountdown
        : undefined,
    showGuestbook:
      typeof featuresInput.showGuestbook === 'boolean'
        ? featuresInput.showGuestbook
        : undefined,
  });

  const supportedVariants = buildInvitationVariants(slug, displayName);

  const normalizedVariants = (() => {
    const sourceVariants = { ...(base?.variants ?? {}), ...variantsInput };
    const builtVariants = supportedVariants;
    const sourceKeys = Object.keys(sourceVariants);

    if (sourceKeys.length === 0) {
      return builtVariants;
    }

    return Object.entries(sourceVariants).reduce(
      (variants, [variantKey, variantValue]) => {
        if (!isRecord(variantValue) || !(variantKey in builtVariants)) {
          return variants;
        }

        const nextVariant = {
          ...builtVariants[variantKey as keyof typeof builtVariants],
          ...variantValue,
          path:
            builtVariants[variantKey as keyof typeof builtVariants]?.path ??
            readString(variantValue.path),
        };

        variants[variantKey as keyof typeof builtVariants] = nextVariant;
        return variants;
      },
      { ...builtVariants }
    );
  })();

  if (supportedVariants.emotional) {
    normalizedVariants.emotional = {
      ...supportedVariants.emotional,
      ...normalizedVariants.emotional,
      available: true,
      path: supportedVariants.emotional.path,
      displayName:
        normalizedVariants.emotional?.displayName ??
        supportedVariants.emotional.displayName,
    };
  }

  if (supportedVariants.simple) {
    normalizedVariants.simple = {
      ...supportedVariants.simple,
      ...normalizedVariants.simple,
      available: true,
      path: supportedVariants.simple.path,
      displayName:
        normalizedVariants.simple?.displayName ?? supportedVariants.simple.displayName,
    };
  }

  const normalizedSeed: InvitationPageSeed = {
    ...(base ?? {}),
    slug,
    displayName,
    description,
    date,
    venue,
    productTier,
    features,
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
    !normalizedSeed.displayName ||
    !normalizedSeed.description ||
    !normalizedSeed.date ||
    !normalizedSeed.venue ||
    !normalizedSeed.couple.groom.name ||
    !normalizedSeed.couple.bride.name ||
    !normalizedSeed.metadata.images.favicon ||
    !('emotional' in normalizedSeed.variants || 'simple' in normalizedSeed.variants)
  ) {
    return null;
  }

  return normalizedSeed;
}

function normalizeConfigSeed(
  docId: string,
  data: Record<string, any>
): InvitationPageSeed | null {
  const fallbackSeed = getWeddingPageBySlug(docId);
  return mergeInvitationPageSeed(fallbackSeed, data, docId);
}

function mergeDisplayPeriod(
  page: InvitationPage,
  period: DisplayPeriodRecord | null
): InvitationPage {
  if (!period) {
    return page;
  }

  return sanitizeHeartIconPlaceholdersDeep({
    ...page,
    displayPeriodEnabled: period.isActive,
    displayPeriodStart: period.startDate,
    displayPeriodEnd: period.endDate,
  });
}

function buildInvitationPageRecord(
  pageSlug: string,
  configSeed: InvitationPageSeed | null,
  registryRecord: InvitationPageRegistryRecord | null
): BuiltInvitationPageRecord | null {
  const sample = getWeddingPageBySlug(pageSlug);
  const hasCustomConfig = registryRecord?.hasCustomConfig ?? Boolean(configSeed);
  const selectedSeed =
    hasCustomConfig && configSeed ? configSeed : configSeed && !sample ? configSeed : sample ?? null;

  if (!selectedSeed) {
    return null;
  }

  const page = sanitizeHeartIconPlaceholdersDeep(
    createInvitationPageFromSeed(selectedSeed, {
      published: registryRecord?.published ?? true,
    })
  );

  return {
    page,
    dataSource: hasCustomConfig && configSeed ? 'firestore' : 'sample',
    hasCustomConfig: hasCustomConfig && Boolean(configSeed),
  };
}

function preferDisplayPeriod(
  current: DisplayPeriodRecord | undefined,
  nextRecord: DisplayPeriodRecord
) {
  if (!current) {
    return nextRecord;
  }

  if (nextRecord.docId === nextRecord.pageSlug && current.docId !== current.pageSlug) {
    return nextRecord;
  }

  if ((nextRecord.updatedAt?.getTime() ?? 0) > (current.updatedAt?.getTime() ?? 0)) {
    return nextRecord;
  }

  return current;
}

async function getDisplayPeriodByPageSlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const directSnapshot = await db
    .collection(DISPLAY_PERIOD_COLLECTION)
    .doc(normalizedPageSlug)
    .get();
  if (directSnapshot.exists) {
    const normalized = normalizeDisplayPeriod(
      normalizedPageSlug,
      directSnapshot.data() ?? {}
    );
    if (normalized) {
      return normalized;
    }
  }

  const snapshot = await db
    .collection(DISPLAY_PERIOD_COLLECTION)
    .where('pageSlug', '==', normalizedPageSlug)
    .get();

  let preferred: DisplayPeriodRecord | null = null;
  snapshot.docs.forEach((docSnapshot) => {
    const normalized = normalizeDisplayPeriod(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    preferred = preferDisplayPeriod(preferred ?? undefined, normalized);
  });

  return preferred;
}

async function getRegistryByPageSlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(PAGE_REGISTRY_COLLECTION)
    .doc(normalizedPageSlug)
    .get();
  if (!snapshot.exists) {
    return null;
  }

  return normalizeRegistryRecord(normalizedPageSlug, snapshot.data() ?? {});
}

async function getConfigByPageSlug(pageSlug: string) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(PAGE_CONFIG_COLLECTION)
    .doc(normalizedPageSlug)
    .get();
  if (!snapshot.exists) {
    return null;
  }

  return normalizeConfigSeed(normalizedPageSlug, snapshot.data() ?? {});
}

const getServerInvitationPageBySlugCached = cache(async (pageSlug: string) => {
  const samplePage = buildSamplePage(pageSlug);
  const db = getServerFirestore();

  if (!db) {
    return samplePage;
  }

  try {
    const [registryRecord, configSeed, displayPeriod] = await Promise.all([
      getRegistryByPageSlug(pageSlug),
      getConfigByPageSlug(pageSlug),
      getDisplayPeriodByPageSlug(pageSlug),
    ]);

    const sourceRecord = buildInvitationPageRecord(pageSlug, configSeed, registryRecord);
    const basePage = sourceRecord?.page ?? samplePage;

    if (!basePage) {
      return null;
    }

    return mergeDisplayPeriod(basePage, displayPeriod);
  } catch (error) {
    console.error('[invitationPageServerService] failed to load invitation page', error);
    return samplePage;
  }
});

export async function getServerInvitationPageBySlug(pageSlug: string | null | undefined) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  return getServerInvitationPageBySlugCached(normalizedPageSlug);
}

export async function getServerInvitationPageDefaultThemeBySlug(
  pageSlug: string | null | undefined
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return DEFAULT_INVITATION_THEME;
  }

  try {
    const registryRecord = await getRegistryByPageSlug(normalizedPageSlug);
    return registryRecord?.defaultTheme ?? DEFAULT_INVITATION_THEME;
  } catch (error) {
    console.error(
      '[invitationPageServerService] failed to load invitation default theme',
      error
    );
    return DEFAULT_INVITATION_THEME;
  }
}

export async function getServerInvitationPageSampleBySlug(
  pageSlug: string | null | undefined
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  return getWeddingPageBySlug(normalizedPageSlug) ?? null;
}

export async function getServerInvitationPageOrSampleSeed(
  pageSlug: string | null | undefined
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return {
      page: null,
      sample: null,
    };
  }

  const page = await getServerInvitationPageBySlug(normalizedPageSlug);
  const sample = getWeddingPageBySlug(normalizedPageSlug);

  return {
    page,
    sample,
  };
}

export function isKnownInvitationPageSample(pageSlug: string): pageSlug is WeddingPageConfig['slug'] {
  return Boolean(getWeddingPageBySlug(pageSlug));
}
