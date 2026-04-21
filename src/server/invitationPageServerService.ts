import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import {
  createInvitationPageFromSeed,
  getAllWeddingPageSeeds,
  getWeddingPageBySlug,
  type WeddingPageConfig,
} from '@/config/weddingPages';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  INVITATION_VARIANT_KEYS,
  resolveAvailableInvitationVariant,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
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
import type {
  InvitationFeatureFlags,
  InvitationPage,
  InvitationPageSeed,
  InvitationProductTier,
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
  createdAt: Date | null;
  updatedAt: Date | null;
};

type BuiltInvitationPageRecord = {
  page: InvitationPage;
  dataSource: 'sample' | 'firestore';
  hasCustomConfig: boolean;
};

export interface ServerEditableInvitationPageConfig {
  slug: string;
  config: InvitationPageSeed;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  productTier: InvitationProductTier;
  features: InvitationFeatureFlags;
  hasCustomConfig: boolean;
  dataSource: 'sample' | 'firestore';
  lastSavedAt: Date | null;
}

export interface ServerCreateInvitationPageDraftInput {
  seedSlug: string;
  slugBase: string;
  groomName?: string;
  brideName?: string;
  published?: boolean;
  defaultTheme?: InvitationThemeKey;
  productTier?: InvitationProductTier;
  initialDisplayPeriodMonths?: number;
}

export interface ServerCreateInvitationPageDraftResult {
  slug: string;
  config: InvitationPageSeed;
}

const DISPLAY_PERIOD_COLLECTION = 'display-periods';
const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';
const PAGE_SLUG_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const PAGE_SLUG_SUFFIX_LENGTH = 3;

function stripUndefinedDeep<T>(value: T): T {
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

function normalizePageSlugInput(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSlugBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function generateSlugSuffix(length = PAGE_SLUG_SUFFIX_LENGTH) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * PAGE_SLUG_SUFFIX_ALPHABET.length);
    return PAGE_SLUG_SUFFIX_ALPHABET[index];
  }).join('');
}

function createDisplayNameFromNames(groomName: string, brideName: string) {
  return `${groomName} · ${brideName}`;
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
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mergeInvitationPageSeed(
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

function normalizeConfigSeed(
  docId: string,
  data: Record<string, any>
): InvitationPageSeed | null {
  const fallbackSeed = getWeddingPageBySlug(docId);
  return mergeInvitationPageSeed(fallbackSeed, data, docId, {
    fallbackTheme: normalizeInvitationTheme(data.defaultTheme),
  });
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

function isPublicInvitationPage(page: InvitationPage) {
  return getInvitationPublicAccessState(page).isPublic;
}

function toEditableSeed(page: InvitationPage): InvitationPageSeed {
  const seed = { ...page } as Record<string, unknown>;
  delete seed.published;
  delete seed.displayPeriodEnabled;
  delete seed.displayPeriodStart;
  delete seed.displayPeriodEnd;
  return sanitizeHeartIconPlaceholdersDeep(seed as InvitationPageSeed);
}

function buildDraftConfigFromSeed(
  seed: InvitationPageSeed,
  overrides: {
    slug: string;
    groomName: string;
    brideName: string;
    productTier: InvitationProductTier;
    theme: InvitationThemeKey;
  }
) {
  const nextSeed = sanitizeHeartIconPlaceholdersDeep(
    JSON.parse(JSON.stringify(seed)) as InvitationPageSeed
  );
  const features = resolveInvitationFeatures(overrides.productTier, seed.features);

  nextSeed.slug = overrides.slug;
  nextSeed.displayName = '';
  nextSeed.description = '';
  nextSeed.date = '';
  nextSeed.venue = '';
  nextSeed.productTier = overrides.productTier;
  nextSeed.features = features;
  nextSeed.groomName = overrides.groomName;
  nextSeed.brideName = overrides.brideName;
  nextSeed.couple.groom = {
    name: overrides.groomName,
    order: '',
    phone: '',
    father: {
      relation: '',
      name: '',
      phone: '',
    },
    mother: {
      relation: '',
      name: '',
      phone: '',
    },
  };
  nextSeed.couple.bride = {
    name: overrides.brideName,
    order: '',
    phone: '',
    father: {
      relation: '',
      name: '',
      phone: '',
    },
    mother: {
      relation: '',
      name: '',
      phone: '',
    },
  };
  nextSeed.weddingDateTime = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
  };
  nextSeed.displayName = createDisplayNameFromNames(
    overrides.groomName,
    overrides.brideName
  );
  nextSeed.description = `${overrides.groomName}님과 ${overrides.brideName}님의 모바일 청첩장입니다.`;
  nextSeed.date = '';
  nextSeed.venue = '';
  nextSeed.metadata.title = nextSeed.displayName;
  nextSeed.metadata.description = nextSeed.description;
  nextSeed.metadata.openGraph.title = nextSeed.displayName;
  nextSeed.metadata.openGraph.description = nextSeed.description;
  nextSeed.metadata.twitter.title = nextSeed.displayName;
  nextSeed.metadata.twitter.description = nextSeed.description;
  nextSeed.pageData = {
    ...nextSeed.pageData,
    subtitle: '',
    ceremonyTime: '',
    ceremonyAddress: '',
    ceremonyContact: '',
    ceremony: {
      time: '',
      location: '',
    },
    reception: {
      time: '',
      location: '',
    },
    galleryImages: [],
    greetingMessage: '',
    greetingAuthor: '',
    mapUrl: '',
    mapDescription: '',
    venueName: '',
    groom: {
      ...nextSeed.couple.groom,
    },
    bride: {
      ...nextSeed.couple.bride,
    },
    kakaoMap: {
      latitude: 0,
      longitude: 0,
      level: nextSeed.pageData?.kakaoMap?.level ?? 3,
      markerTitle: '',
    },
    venueGuide: [],
    wreathGuide: [],
    giftInfo: {
      groomAccounts: [],
      brideAccounts: [],
      message: '',
    },
  };
  nextSeed.musicEnabled = false;
  nextSeed.musicCategoryId = '';
  nextSeed.musicTrackId = '';
  nextSeed.musicStoragePath = '';
  nextSeed.musicUrl = '';
  nextSeed.variants = buildInvitationVariants(overrides.slug, nextSeed.displayName, {
    availability: createInvitationVariantAvailability([overrides.theme as InvitationVariantKey]),
  });

  return nextSeed;
}

async function isInvitationPageSlugTaken(db: FirebaseFirestore.Firestore, pageSlug: string) {
  const [configSnapshot, registrySnapshot] = await Promise.all([
    db.collection(PAGE_CONFIG_COLLECTION).doc(pageSlug).get(),
    db.collection(PAGE_REGISTRY_COLLECTION).doc(pageSlug).get(),
  ]);

  return configSnapshot.exists || registrySnapshot.exists;
}

async function createUniqueInvitationPageSlug(
  db: FirebaseFirestore.Firestore,
  slugBase: string
) {
  const normalizedSlugBase = normalizeSlugBase(slugBase);
  if (!normalizedSlugBase) {
    throw new Error('A valid URL slug base is required.');
  }

  if (!(await isInvitationPageSlugTaken(db, normalizedSlugBase))) {
    return normalizedSlugBase;
  }

  let nextSlug = `${normalizedSlugBase}-${generateSlugSuffix()}`;

  while (await isInvitationPageSlugTaken(db, nextSlug)) {
    nextSlug = `${normalizedSlugBase}-${generateSlugSuffix()}`;
  }

  return nextSlug;
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

export async function getServerInvitationPageDisplayPeriodSummary(pageSlug: string) {
  const displayPeriod = await getDisplayPeriodByPageSlug(pageSlug);

  return {
    enabled: displayPeriod?.isActive === true,
    startDate: displayPeriod?.startDate ?? null,
    endDate: displayPeriod?.endDate ?? null,
  };
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

async function upsertRegistryRecord(
  pageSlug: string,
  payload: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
    hasCustomConfig?: boolean;
  }
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('올바른 페이지 주소가 필요합니다.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const docRef = db.collection(PAGE_REGISTRY_COLLECTION).doc(normalizedPageSlug);
  const existingSnapshot = await docRef.get();
  const existing = existingSnapshot.exists
    ? normalizeRegistryRecord(normalizedPageSlug, existingSnapshot.data() ?? {})
    : null;
  const now = new Date();

  await docRef.set(
    {
      pageSlug: normalizedPageSlug,
      published: payload.published ?? existing?.published ?? true,
      defaultTheme:
        payload.defaultTheme ?? existing?.defaultTheme ?? DEFAULT_INVITATION_THEME,
      hasCustomConfig: payload.hasCustomConfig ?? existing?.hasCustomConfig ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      editorTokenHash: FieldValue.delete(),
    },
    { merge: true }
  );
}

async function upsertDisplayPeriodRecord(
  pageSlug: string,
  payload: {
    isActive: boolean;
    startDate: Date | null;
    endDate: Date | null;
  }
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('올바른 페이지 주소가 필요합니다.');
  }

  if (payload.isActive && (!payload.startDate || !payload.endDate)) {
    throw new Error('Display period dates are required.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const docRef = db.collection(DISPLAY_PERIOD_COLLECTION).doc(normalizedPageSlug);
  const existingSnapshot = await docRef.get();
  const existingCreatedAt = existingSnapshot.exists
    ? toDate(existingSnapshot.data()?.createdAt)
    : null;
  const now = new Date();

  await docRef.set(
    {
      pageSlug: normalizedPageSlug,
      isActive: payload.isActive,
      startDate: payload.isActive ? payload.startDate : null,
      endDate: payload.isActive ? payload.endDate : null,
      createdAt: existingCreatedAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );
}

async function loadServerInvitationPageBySlug(
  pageSlug: string,
  includePrivate: boolean
) {
  const samplePage = buildSamplePage(pageSlug);
  const db = getServerFirestore();

  if (!db) {
    if (!samplePage) {
      return null;
    }

    return includePrivate || isPublicInvitationPage(samplePage) ? samplePage : null;
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

    const mergedPage = mergeDisplayPeriod(basePage, displayPeriod);
    return includePrivate || isPublicInvitationPage(mergedPage) ? mergedPage : null;
  } catch (error) {
    console.error('[invitationPageServerService] failed to load invitation page', error);
    if (!samplePage) {
      return null;
    }

    return includePrivate || isPublicInvitationPage(samplePage) ? samplePage : null;
  }
}

export async function getServerInvitationPageBySlug(
  pageSlug: string | null | undefined,
  options: {
    includePrivate?: boolean;
  } = {}
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  return loadServerInvitationPageBySlug(
    normalizedPageSlug,
    options.includePrivate === true
  );
}

export async function getServerEditableInvitationPageConfig(
  pageSlug: string
): Promise<ServerEditableInvitationPageConfig | null> {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  const fallbackConfig = getWeddingPageBySlug(normalizedPageSlug);
  const fallbackProductTier = normalizeInvitationProductTier(
    fallbackConfig?.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );
  const fallbackFeatures = resolveInvitationFeatures(
    fallbackProductTier,
    fallbackConfig?.features
  );

  const db = getServerFirestore();
  if (!db) {
    return fallbackConfig
      ? {
          slug: normalizedPageSlug,
          config: sanitizeHeartIconPlaceholdersDeep(fallbackConfig),
          published: true,
          defaultTheme: DEFAULT_INVITATION_THEME,
          productTier: fallbackProductTier,
          features: fallbackFeatures,
          hasCustomConfig: false,
          dataSource: 'sample',
          lastSavedAt: null,
        }
      : null;
  }

  const [registryRecord, configSeed] = await Promise.all([
    getRegistryByPageSlug(normalizedPageSlug),
    getConfigByPageSlug(normalizedPageSlug),
  ]);

  const sourceRecord = buildInvitationPageRecord(
    normalizedPageSlug,
    configSeed,
    registryRecord
  );

  if (!sourceRecord) {
    return null;
  }

  const editableConfig =
    sourceRecord.hasCustomConfig && configSeed
      ? sanitizeHeartIconPlaceholdersDeep(configSeed)
      : fallbackConfig ?? toEditableSeed(sourceRecord.page);
  const productTier = normalizeInvitationProductTier(
    editableConfig.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );
  const features = resolveInvitationFeatures(productTier, editableConfig.features);

  return {
    slug: normalizedPageSlug,
    config: editableConfig,
    published: sourceRecord.page.published,
    defaultTheme: registryRecord?.defaultTheme ?? DEFAULT_INVITATION_THEME,
    productTier,
    features,
    hasCustomConfig: sourceRecord.hasCustomConfig,
    dataSource: sourceRecord.dataSource,
    lastSavedAt: registryRecord?.updatedAt ?? null,
  };
}

export async function saveServerInvitationPageConfig(
  config: InvitationPageSeed,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const fallbackTheme = options.defaultTheme
    ? normalizeInvitationTheme(options.defaultTheme)
    : resolveAvailableInvitationVariant(config.variants, DEFAULT_INVITATION_THEME) ??
      DEFAULT_INVITATION_THEME;

  const normalizedConfig = mergeInvitationPageSeed(
    getWeddingPageBySlug(config.slug),
    config as unknown as Record<string, any>,
    config.slug,
    {
      fallbackTheme,
    }
  );

  if (!normalizedConfig) {
    throw new Error('초대 페이지 구성이 잘못되었습니다.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const docRef = db.collection(PAGE_CONFIG_COLLECTION).doc(normalizedConfig.slug);
  const existingSnapshot = await docRef.get();
  const existingCreatedAt = existingSnapshot.exists
    ? toDate(existingSnapshot.data()?.createdAt)
    : null;
  const now = new Date();
  const configPayload = stripUndefinedDeep(normalizedConfig);

  await docRef.set(
    {
      ...configPayload,
      createdAt: existingCreatedAt ?? now,
      updatedAt: now,
      editorTokenHash: FieldValue.delete(),
    },
    { merge: true }
  );

  await upsertRegistryRecord(normalizedConfig.slug, {
    published: options.published ?? true,
    defaultTheme: options.defaultTheme ?? DEFAULT_INVITATION_THEME,
    hasCustomConfig: true,
  });
}

export async function createServerInvitationPageDraftFromSeed(
  input: ServerCreateInvitationPageDraftInput
): Promise<ServerCreateInvitationPageDraftResult> {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const seed =
    getWeddingPageBySlug(input.seedSlug) ?? getAllWeddingPageSeeds()[0] ?? null;
  if (!seed) {
    throw new Error('Invitation page seed was not found.');
  }

  const groomName = (input.groomName ?? seed.couple.groom.name ?? seed.groomName).trim();
  const brideName = (input.brideName ?? seed.couple.bride.name ?? seed.brideName).trim();

  if (!groomName || !brideName) {
    throw new Error('Groom and bride names are required.');
  }

  const slug = await createUniqueInvitationPageSlug(db, input.slugBase);
  const config = buildDraftConfigFromSeed(seed, {
    slug,
    groomName,
    brideName,
    productTier: normalizeInvitationProductTier(
      input.productTier,
      DEFAULT_INVITATION_PRODUCT_TIER
    ),
    theme: normalizeInvitationTheme(input.defaultTheme),
  });
  const now = new Date();
  const configPayload = stripUndefinedDeep(config);

  await db.collection(PAGE_CONFIG_COLLECTION).doc(slug).set(
    {
      ...configPayload,
      seedSourceSlug: seed.slug,
      editorTokenHash: FieldValue.delete(),
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await upsertRegistryRecord(slug, {
    published: input.published ?? false,
    defaultTheme: input.defaultTheme ?? DEFAULT_INVITATION_THEME,
    hasCustomConfig: true,
  });

  const initialDisplayPeriodMonths =
    typeof input.initialDisplayPeriodMonths === 'number' &&
    Number.isFinite(input.initialDisplayPeriodMonths)
      ? Math.floor(input.initialDisplayPeriodMonths)
      : 0;

  if (initialDisplayPeriodMonths > 0) {
    const displayPeriodStart = new Date(now);
    const displayPeriodEnd = new Date(now);
    displayPeriodEnd.setMonth(displayPeriodEnd.getMonth() + initialDisplayPeriodMonths);

    await upsertDisplayPeriodRecord(slug, {
      isActive: true,
      startDate: displayPeriodStart,
      endDate: displayPeriodEnd,
    });
  }

  return {
    slug,
    config,
  };
}

export async function restoreServerInvitationPageConfig(
  pageSlug: string,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug || !getWeddingPageBySlug(normalizedPageSlug)) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  await upsertRegistryRecord(normalizedPageSlug, {
    published: options.published ?? true,
    defaultTheme: options.defaultTheme,
    hasCustomConfig: false,
  });
}

export async function setServerInvitationPagePublished(
  pageSlug: string,
  published: boolean,
  options: {
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('올바른 페이지 주소가 필요합니다.');
  }

  const [existingConfig, existingRegistry] = await Promise.all([
    getConfigByPageSlug(normalizedPageSlug),
    getRegistryByPageSlug(normalizedPageSlug),
  ]);

  if (!getWeddingPageBySlug(normalizedPageSlug) && !existingConfig && !existingRegistry) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  await upsertRegistryRecord(normalizedPageSlug, {
    published,
    defaultTheme: options.defaultTheme ?? existingRegistry?.defaultTheme,
    hasCustomConfig: existingRegistry?.hasCustomConfig ?? Boolean(existingConfig),
  });
}

export async function setServerInvitationPageVariantAvailability(
  pageSlug: string,
  variantKey: InvitationVariantKey,
  available: boolean,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('올바른 페이지 주소가 필요합니다.');
  }

  const editableConfig = await getServerEditableInvitationPageConfig(normalizedPageSlug);

  if (!editableConfig) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  const baseConfig = sanitizeHeartIconPlaceholdersDeep(
    JSON.parse(JSON.stringify(editableConfig.config)) as InvitationPageSeed
  );
  const supportedVariants = buildInvitationVariants(
    normalizedPageSlug,
    baseConfig.displayName,
    {
      availability: createInvitationVariantAvailability([]),
    }
  );

  const nextVariants = INVITATION_VARIANT_KEYS.reduce<InvitationPageSeed['variants']>(
    (variants, key) => {
      const builtVariant = supportedVariants[key];
      if (!builtVariant) {
        return variants;
      }

      const sourceVariant = baseConfig.variants?.[key];
      const nextAvailable =
        key === variantKey ? available : sourceVariant?.available === true;

      if (!sourceVariant && !nextAvailable) {
        return variants;
      }

      variants[key] = {
        ...builtVariant,
        ...(sourceVariant ?? {}),
        available: nextAvailable,
        path: builtVariant.path,
        displayName: readString(sourceVariant?.displayName, builtVariant.displayName),
      };

      return variants;
    },
    {}
  );

  if (getAvailableInvitationVariantKeys(nextVariants).length === 0) {
    const fallbackTheme = normalizeInvitationTheme(
      options.defaultTheme,
      editableConfig.defaultTheme
    );
    const fallbackVariant = supportedVariants[fallbackTheme];

    if (fallbackVariant) {
      nextVariants[fallbackTheme] = {
        ...fallbackVariant,
        available: true,
      };
    }
  }

  await saveServerInvitationPageConfig(
    {
      ...baseConfig,
      slug: normalizedPageSlug,
      variants: nextVariants,
    },
    {
      published: options.published ?? editableConfig.published,
      defaultTheme: options.defaultTheme ?? editableConfig.defaultTheme,
    }
  );
}

export async function extendServerInvitationPageDisplayPeriod(
  pageSlug: string,
  months = 1
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  const normalizedMonths =
    Number.isFinite(months) && Math.trunc(months) > 0 ? Math.trunc(months) : 1;
  const currentDisplayPeriod = await getDisplayPeriodByPageSlug(normalizedPageSlug);

  if (!currentDisplayPeriod?.startDate || !currentDisplayPeriod?.endDate) {
    throw new Error('Display period is not configured.');
  }

  const nextStartDate = new Date(currentDisplayPeriod.startDate);
  const nextEndDate = new Date(currentDisplayPeriod.endDate);
  nextEndDate.setMonth(nextEndDate.getMonth() + normalizedMonths);

  await upsertDisplayPeriodRecord(normalizedPageSlug, {
    isActive: true,
    startDate: nextStartDate,
    endDate: nextEndDate,
  });

  return {
    startDate: nextStartDate,
    endDate: nextEndDate,
  };
}

export async function setServerInvitationPageDisplayPeriod(
  pageSlug: string,
  payload: {
    enabled: boolean;
    startDate: Date | null;
    endDate: Date | null;
  }
) {
  const normalizedPageSlug = normalizePageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    throw new Error('Page slug is required.');
  }

  const editableConfig = await getServerEditableInvitationPageConfig(normalizedPageSlug);
  if (!editableConfig) {
    throw new Error('Invitation page was not found.');
  }

  if (payload.enabled && (!payload.startDate || !payload.endDate)) {
    throw new Error('Display period dates are required.');
  }

  await upsertDisplayPeriodRecord(normalizedPageSlug, {
    isActive: payload.enabled,
    startDate: payload.startDate,
    endDate: payload.endDate,
  });

  return {
    enabled: payload.enabled,
    startDate: payload.enabled ? payload.startDate : null,
    endDate: payload.enabled ? payload.endDate : null,
  };
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
