import 'server-only';

import { cache } from 'react';
import { FieldValue } from 'firebase-admin/firestore';

import {
  createInvitationPageFromSeed,
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

const DISPLAY_PERIOD_COLLECTION = 'display-periods';
const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';

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
  if (!page.published) {
    return false;
  }

  if (!page.displayPeriodEnabled) {
    return true;
  }

  if (!page.displayPeriodStart || !page.displayPeriodEnd) {
    return false;
  }

  const now = new Date();
  return now >= page.displayPeriodStart && now <= page.displayPeriodEnd;
}

function toEditableSeed(page: InvitationPage): InvitationPageSeed {
  const seed = { ...page } as Record<string, unknown>;
  delete seed.published;
  delete seed.displayPeriodEnabled;
  delete seed.displayPeriodStart;
  delete seed.displayPeriodEnd;
  return sanitizeHeartIconPlaceholdersDeep(seed as InvitationPageSeed);
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

const getServerInvitationPageBySlugCached = cache(
  async (pageSlug: string, includePrivate: boolean) => {
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
);

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

  return getServerInvitationPageBySlugCached(
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

  await docRef.set(
    {
      ...normalizedConfig,
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
