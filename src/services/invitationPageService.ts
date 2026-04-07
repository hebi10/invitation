import {
  createInvitationPageFromSeed,
  getAllWeddingPageSeeds,
  getWeddingPageBySlug,
} from '@/config/weddingPages';
import {
  buildInvitationVariants,
  createInvitationVariantAvailability,
  getAvailableInvitationVariantKeys,
  INVITATION_VARIANT_KEYS,
  resolveAvailableInvitationVariant,
  type InvitationVariantKey,
} from '@/lib/invitationVariants';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import {
  isRecord,
  normalizeInvitationTheme,
  readNumber,
  readString,
  toDate,
} from '@/lib/invitationPageNormalization';
import {
  buildInvitationTemplateDefinitions,
  DEFAULT_INVITATION_PRODUCT_TIER,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import type {
  InvitationFeatureFlags,
  InvitationPage,
  InvitationProductTier,
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

export interface InvitationPageSummary {
  slug: string;
  displayName: string;
  description: string;
  date: string;
  venue: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  productTier: InvitationProductTier;
  features: InvitationFeatureFlags;
  displayPeriodEnabled: boolean;
  displayPeriodStart: Date | null;
  displayPeriodEnd: Date | null;
  variants: InvitationPage['variants'];
  dataSource: 'seed' | 'firestore';
  hasCustomConfig: boolean;
}

export interface EditableInvitationPageConfig {
  slug: string;
  config: InvitationPageSeed;
  published: boolean;
  defaultTheme: InvitationThemeKey;
  productTier: InvitationProductTier;
  features: InvitationFeatureFlags;
  hasCustomConfig: boolean;
  dataSource: 'seed' | 'firestore';
  lastSavedAt: Date | null;
}

export interface InvitationPageSeedTemplate {
  id: string;
  seedSlug: string;
  theme: InvitationThemeKey;
  productTier: InvitationProductTier;
  displayName: string;
  description: string;
  features: InvitationFeatureFlags;
}

export interface CreateInvitationPageDraftInput {
  seedSlug: string;
  slugBase: string;
  groomName?: string;
  brideName?: string;
  published?: boolean;
  defaultTheme?: InvitationThemeKey;
  productTier?: InvitationProductTier;
}

export interface CreateInvitationPageDraftResult {
  slug: string;
  config: InvitationPageSeed;
}

export interface InvitationPageLookupOptions {
  includeSeedFallback?: boolean;
  includeSeedPages?: boolean;
  fallbackOnError?: boolean;
  retryOnPermissionDenied?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
}

type FirestoreState = {
  db: any;
  modules: {
    collection: any;
    deleteField: any;
    doc: any;
    getDoc: any;
    getDocs: any;
    query: any;
    setDoc: any;
    where: any;
    deleteDoc: any;
  };
};

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
  dataSource: 'seed' | 'firestore';
  hasCustomConfig: boolean;
};

const DISPLAY_PERIOD_COLLECTION = 'display-periods';
const PAGE_CONFIG_COLLECTION = 'invitation-page-configs';
const PAGE_REGISTRY_COLLECTION = 'invitation-page-registry';
const PAGE_SLUG_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const PAGE_SLUG_SUFFIX_LENGTH = 3;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function cloneInvitationPageSeed(seed: InvitationPageSeed): InvitationPageSeed {
  return sanitizeHeartIconPlaceholdersDeep(
    JSON.parse(JSON.stringify(seed)) as InvitationPageSeed
  );
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

export function normalizeInvitationPageSlugBase(value: string) {
  return normalizeSlugBase(value);
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

function buildSeedPage(pageSlug: string): InvitationPage | null {
  const seed = getWeddingPageBySlug(pageSlug);
  if (!seed) {
    return null;
  }

  return sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(seed));
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
    hasFullTrueAvailability && typeof options.fallbackTheme === 'string';
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

function toEditableSeed(page: InvitationPage): InvitationPageSeed {
  const seed = { ...page } as Record<string, unknown>;
  delete seed.published;
  delete seed.displayPeriodEnabled;
  delete seed.displayPeriodStart;
  delete seed.displayPeriodEnd;
  return sanitizeHeartIconPlaceholdersDeep(seed as InvitationPageSeed);
}

function toInvitationPageSummary(
  page: InvitationPage,
  options: {
    dataSource: 'seed' | 'firestore';
    hasCustomConfig: boolean;
    defaultTheme: InvitationThemeKey;
    createdAt: Date | null;
    updatedAt: Date | null;
  }
): InvitationPageSummary {
  const productTier = normalizeInvitationProductTier(
    page.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );
  const features = resolveInvitationFeatures(productTier, page.features);

  return {
    slug: page.slug,
    displayName: page.displayName,
    description: page.description,
    date: page.date,
    venue: page.venue,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    published: page.published,
    defaultTheme: options.defaultTheme,
    productTier,
    features,
    displayPeriodEnabled: page.displayPeriodEnabled,
    displayPeriodStart: page.displayPeriodStart,
    displayPeriodEnd: page.displayPeriodEnd,
    variants: page.variants,
    dataSource: options.dataSource,
    hasCustomConfig: options.hasCustomConfig,
  };
}

function getSeedSummaries(): InvitationPageSummary[] {
  return getAllWeddingPageSeeds()
    .map((seed) => sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(seed)))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'))
    .map((page) =>
      toInvitationPageSummary(page, {
        dataSource: 'seed',
        hasCustomConfig: false,
        defaultTheme: DEFAULT_INVITATION_THEME,
        createdAt: null,
        updatedAt: null,
      })
    );
}

function getSeedTemplates(): InvitationPageSeedTemplate[] {
  const defaultSeedSlug = getAllWeddingPageSeeds()[0]?.slug;

  if (!defaultSeedSlug) {
    return [];
  }

  return buildInvitationTemplateDefinitions(defaultSeedSlug);
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
  const nextSeed = cloneInvitationPageSeed(seed);
  const displayName = createDisplayNameFromNames('', '');
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
  nextSeed.metadata.title = `${displayName} 결혼식에 초대합니다`;
  nextSeed.metadata.openGraph.title = `${displayName} 결혼식 초대`;
  nextSeed.metadata.twitter.title = `${displayName} 결혼식 초대`;
  nextSeed.metadata.keywords = Array.from(
    new Set(
      [
        ...nextSeed.metadata.keywords,
        overrides.groomName,
        overrides.brideName,
        '청첩장',
      ].filter((value) => typeof value === 'string' && value.trim())
    )
  );
  nextSeed.variants = buildInvitationVariants(overrides.slug, displayName, {
    availability: createInvitationVariantAvailability([
      overrides.theme as InvitationVariantKey,
    ]),
  });

  if (nextSeed.pageData?.groom) {
    nextSeed.pageData.groom = {
      ...nextSeed.pageData.groom,
      ...nextSeed.couple.groom,
      name: overrides.groomName,
    };
  }

  if (nextSeed.pageData?.bride) {
    nextSeed.pageData.bride = {
      ...nextSeed.pageData.bride,
      ...nextSeed.couple.bride,
      name: overrides.brideName,
    };
  }

  if (nextSeed.pageData) {
    nextSeed.pageData.greetingAuthor = `${overrides.groomName} · ${overrides.brideName}`;
  }

  nextSeed.metadata.title = '';
  nextSeed.metadata.description = '';
  nextSeed.metadata.images.wedding = '';
  nextSeed.metadata.openGraph.title = '';
  nextSeed.metadata.openGraph.description = '';
  nextSeed.metadata.twitter.title = '';
  nextSeed.metadata.twitter.description = '';
  nextSeed.metadata.keywords = [overrides.groomName, overrides.brideName, '청첩장'];
  nextSeed.variants = buildInvitationVariants(overrides.slug, '', {
    availability: createInvitationVariantAvailability([
      overrides.theme as InvitationVariantKey,
    ]),
  });
  nextSeed.pageData = {
    ...nextSeed.pageData,
    subtitle: '',
    ceremonyTime: '',
    ceremonyAddress: '',
    ceremonyContact: '',
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

  return nextSeed;
}

async function ensureFirestoreState(): Promise<FirestoreState | null> {
  if (!USE_FIREBASE) {
    return null;
  }

  const firebase = await ensureFirebaseInit();
  if (!firebase.db) {
    throw new Error('데이터 저장소가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  }

  const firestoreModule = await import('firebase/firestore');

  return {
    db: firebase.db,
    modules: {
      collection: firestoreModule.collection,
      deleteField: firestoreModule.deleteField,
      deleteDoc: firestoreModule.deleteDoc,
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      getDocs: firestoreModule.getDocs,
      query: firestoreModule.query,
      setDoc: firestoreModule.setDoc,
      where: firestoreModule.where,
    },
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

function preferRegistryRecord(
  current: InvitationPageRegistryRecord | undefined,
  nextRecord: InvitationPageRegistryRecord
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

async function getDisplayPeriodMap(firestore: FirestoreState) {
  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collection(firestore.db, DISPLAY_PERIOD_COLLECTION)
  );
  const periodMap = new Map<string, DisplayPeriodRecord>();

  for (const docSnapshot of snapshot.docs as Array<{
    id: string;
    data: () => Record<string, any>;
  }>) {
    const normalized = normalizeDisplayPeriod(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      continue;
    }

    periodMap.set(
      normalized.pageSlug,
      preferDisplayPeriod(periodMap.get(normalized.pageSlug), normalized)
    );
  }

  return periodMap;
}

async function getDisplayPeriodByPageSlug(
  firestore: FirestoreState,
  pageSlug: string
) {
  const directSnapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, DISPLAY_PERIOD_COLLECTION, pageSlug)
  );
  if (directSnapshot.exists()) {
    const normalized = normalizeDisplayPeriod(pageSlug, directSnapshot.data());
    if (normalized) {
      return normalized;
    }
  }

  const snapshot = await firestore.modules.getDocs(
    firestore.modules.query(
      firestore.modules.collection(firestore.db, DISPLAY_PERIOD_COLLECTION),
      firestore.modules.where('pageSlug', '==', pageSlug)
    )
  );

  let preferred: DisplayPeriodRecord | null = null;
  snapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, any> }) => {
    const normalized = normalizeDisplayPeriod(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      return;
    }

    preferred = preferDisplayPeriod(preferred ?? undefined, normalized);
  });

  return preferred;
}

async function getRegistryMap(firestore: FirestoreState) {
  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collection(firestore.db, PAGE_REGISTRY_COLLECTION)
  );
  const registryMap = new Map<string, InvitationPageRegistryRecord>();

  for (const docSnapshot of snapshot.docs as Array<{
    id: string;
    data: () => Record<string, any>;
  }>) {
    const normalized = normalizeRegistryRecord(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      continue;
    }

    registryMap.set(
      normalized.pageSlug,
      preferRegistryRecord(registryMap.get(normalized.pageSlug), normalized)
    );
  }

  return registryMap;
}

async function getRegistryByPageSlug(
  firestore: FirestoreState,
  pageSlug: string
) {
  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, PAGE_REGISTRY_COLLECTION, pageSlug)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeRegistryRecord(pageSlug, snapshot.data());
}

async function getConfigMap(firestore: FirestoreState) {
  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collection(firestore.db, PAGE_CONFIG_COLLECTION)
  );
  const configMap = new Map<string, InvitationPageSeed>();

  for (const docSnapshot of snapshot.docs as Array<{
    id: string;
    data: () => Record<string, any>;
  }>) {
    const normalized = normalizeConfigSeed(docSnapshot.id, docSnapshot.data());
    if (!normalized) {
      continue;
    }

    configMap.set(normalized.slug, normalized);
  }

  return configMap;
}

async function getConfigByPageSlug(
  firestore: FirestoreState,
  pageSlug: string
) {
  const snapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, PAGE_CONFIG_COLLECTION, pageSlug)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeConfigSeed(pageSlug, snapshot.data());
}

async function isInvitationPageSlugTaken(
  firestore: FirestoreState,
  pageSlug: string
) {
  if (getWeddingPageBySlug(pageSlug)) {
    return true;
  }

  const [configSnapshot, registrySnapshot] = await Promise.all([
    firestore.modules.getDoc(
      firestore.modules.doc(firestore.db, PAGE_CONFIG_COLLECTION, pageSlug)
    ),
    firestore.modules.getDoc(
      firestore.modules.doc(firestore.db, PAGE_REGISTRY_COLLECTION, pageSlug)
    ),
  ]);

  return configSnapshot.exists() || registrySnapshot.exists();
}

async function createUniqueInvitationPageSlug(
  firestore: FirestoreState,
  slugBase: string
) {
  const normalizedSlugBase = normalizeSlugBase(slugBase);
  if (!normalizedSlugBase) {
    throw new Error('올바른 페이지 주소를 입력해 주세요.');
  }

  if (!(await isInvitationPageSlugTaken(firestore, normalizedSlugBase))) {
    return normalizedSlugBase;
  }

  let nextSlug = `${normalizedSlugBase}-${generateSlugSuffix()}`;

  while (await isInvitationPageSlugTaken(firestore, nextSlug)) {
    nextSlug = `${normalizedSlugBase}-${generateSlugSuffix()}`;
  }

  return nextSlug;
}

function buildInvitationPageRecord(
  pageSlug: string,
  configSeed: InvitationPageSeed | null,
  registryRecord: InvitationPageRegistryRecord | null
): BuiltInvitationPageRecord | null {
  const seed = getWeddingPageBySlug(pageSlug);
  const hasCustomConfig = registryRecord?.hasCustomConfig ?? Boolean(configSeed);
  const selectedSeed =
    hasCustomConfig && configSeed ? configSeed : configSeed && !seed ? configSeed : seed ?? null;

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
    dataSource: hasCustomConfig && configSeed ? 'firestore' : 'seed',
    hasCustomConfig: hasCustomConfig && Boolean(configSeed),
  };
}

async function upsertRegistryRecord(
  firestore: FirestoreState,
  pageSlug: string,
  payload: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
    hasCustomConfig?: boolean;
  }
) {
  const existing = await getRegistryByPageSlug(firestore, pageSlug);
  const now = new Date();

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, PAGE_REGISTRY_COLLECTION, pageSlug),
    {
      pageSlug,
      published: payload.published ?? existing?.published ?? true,
      defaultTheme:
        payload.defaultTheme ?? existing?.defaultTheme ?? DEFAULT_INVITATION_THEME,
      hasCustomConfig:
        payload.hasCustomConfig ?? existing?.hasCustomConfig ?? false,
      editorTokenHash: firestore.modules.deleteField(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );
}

async function deleteDisplayPeriodDocuments(
  firestore: FirestoreState,
  pageSlug: string
) {
  const directSnapshot = await firestore.modules.getDoc(
    firestore.modules.doc(firestore.db, DISPLAY_PERIOD_COLLECTION, pageSlug)
  );

  if (directSnapshot.exists()) {
    await firestore.modules.deleteDoc(directSnapshot.ref);
  }

  const duplicateSnapshot = await firestore.modules.getDocs(
    firestore.modules.query(
      firestore.modules.collection(firestore.db, DISPLAY_PERIOD_COLLECTION),
      firestore.modules.where('pageSlug', '==', pageSlug)
    )
  );

  await Promise.all(
    duplicateSnapshot.docs
      .filter((docSnapshot: { id: string }) => docSnapshot.id !== pageSlug)
      .map((docSnapshot: { ref: any }) => firestore.modules.deleteDoc(docSnapshot.ref))
  );
}

async function syncDisplayPeriod(
  firestore: FirestoreState,
  pageSlug: string,
  payload: {
    displayPeriodEnabled: boolean;
    displayPeriodStart: Date | null;
    displayPeriodEnd: Date | null;
  }
) {
  if (
    !payload.displayPeriodEnabled ||
    !payload.displayPeriodStart ||
    !payload.displayPeriodEnd
  ) {
    await deleteDisplayPeriodDocuments(firestore, pageSlug);
    return;
  }

  const docRef = firestore.modules.doc(firestore.db, DISPLAY_PERIOD_COLLECTION, pageSlug);
  const existingSnapshot = await firestore.modules.getDoc(docRef);
  const existingCreatedAt = existingSnapshot.exists()
    ? toDate(existingSnapshot.data().createdAt)
    : null;

  await firestore.modules.setDoc(
    docRef,
    {
      pageSlug,
      isActive: true,
      startDate: payload.displayPeriodStart,
      endDate: payload.displayPeriodEnd,
      createdAt: existingCreatedAt ?? new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function getEditableInvitationPageConfig(
  pageSlug: string
): Promise<EditableInvitationPageConfig | null> {
  const seed = getWeddingPageBySlug(pageSlug);
  const fallbackConfig = seed ? sanitizeHeartIconPlaceholdersDeep(seed) : null;
  const fallbackProductTier = normalizeInvitationProductTier(
    fallbackConfig?.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );
  const fallbackFeatures = resolveInvitationFeatures(
    fallbackProductTier,
    fallbackConfig?.features
  );

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return fallbackConfig
      ? {
          slug: pageSlug,
          config: fallbackConfig,
          published: true,
          defaultTheme: DEFAULT_INVITATION_THEME,
          productTier: fallbackProductTier,
          features: fallbackFeatures,
          hasCustomConfig: false,
          dataSource: 'seed',
          lastSavedAt: null,
      }
      : null;
  }

  try {
    const [registryRecord, configSeed] = await Promise.all([
      getRegistryByPageSlug(firestore, pageSlug),
      getConfigByPageSlug(firestore, pageSlug),
    ]);

    const sourceRecord = buildInvitationPageRecord(pageSlug, configSeed, registryRecord);
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
      slug: pageSlug,
      config: editableConfig,
      published: sourceRecord.page.published,
      defaultTheme: registryRecord?.defaultTheme ?? DEFAULT_INVITATION_THEME,
      productTier,
      features,
      hasCustomConfig: sourceRecord.hasCustomConfig,
      dataSource: sourceRecord.dataSource,
      lastSavedAt: registryRecord?.updatedAt ?? null,
    };
  } catch (error) {
    console.error('[invitationPageService] failed to load editable config', error);
    return fallbackConfig
      ? {
          slug: pageSlug,
          config: fallbackConfig,
          published: true,
          defaultTheme: DEFAULT_INVITATION_THEME,
          productTier: fallbackProductTier,
          features: fallbackFeatures,
          hasCustomConfig: false,
          dataSource: 'seed',
          lastSavedAt: null,
      }
      : null;
  }
}

export async function saveInvitationPageConfig(
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

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const existingConfig = await getConfigByPageSlug(firestore, normalizedConfig.slug);
  const now = new Date();

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, PAGE_CONFIG_COLLECTION, normalizedConfig.slug),
    {
      ...normalizedConfig,
      editorTokenHash: firestore.modules.deleteField(),
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await upsertRegistryRecord(firestore, normalizedConfig.slug, {
    published: options.published ?? true,
    defaultTheme: options.defaultTheme ?? DEFAULT_INVITATION_THEME,
    hasCustomConfig: true,
  });

  return existingConfig ?? normalizedConfig;
}

export function getInvitationPageSeedTemplates() {
  return getSeedTemplates();
}

export async function createInvitationPageDraftFromSeed(
  input: CreateInvitationPageDraftInput
): Promise<CreateInvitationPageDraftResult> {
  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const seed = getWeddingPageBySlug(input.seedSlug);
  if (!seed) {
    throw new Error('청첩장 기본 템플릿을 찾을 수 없습니다.');
  }

  const groomName = (input.groomName ?? seed.couple.groom.name ?? seed.groomName).trim();
  const brideName = (input.brideName ?? seed.couple.bride.name ?? seed.brideName).trim();

  if (!groomName || !brideName) {
    throw new Error('신랑과 신부 이름을 모두 입력해 주세요.');
  }

  const slug = await createUniqueInvitationPageSlug(firestore, input.slugBase);
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

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, PAGE_CONFIG_COLLECTION, slug),
    {
      ...config,
      seedSourceSlug: seed.slug,
      editorTokenHash: firestore.modules.deleteField(),
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await upsertRegistryRecord(firestore, slug, {
    published: input.published ?? false,
    defaultTheme: input.defaultTheme ?? DEFAULT_INVITATION_THEME,
    hasCustomConfig: true,
  });

  return {
    slug,
    config,
  };
}

export async function restoreInvitationPageConfig(
  pageSlug: string,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const seed = getWeddingPageBySlug(pageSlug);
  if (!seed) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  await upsertRegistryRecord(firestore, pageSlug, {
    published: options.published ?? true,
    defaultTheme: options.defaultTheme,
    hasCustomConfig: false,
  });
}

export async function setInvitationPagePublished(
  pageSlug: string,
  published: boolean,
  options: {
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const seed = getWeddingPageBySlug(pageSlug);

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const existingConfig = await getConfigByPageSlug(firestore, pageSlug);
  const existingRegistry = await getRegistryByPageSlug(firestore, pageSlug);

  if (!seed && !existingConfig && !existingRegistry) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  await upsertRegistryRecord(firestore, pageSlug, {
    published,
    defaultTheme: options.defaultTheme ?? existingRegistry?.defaultTheme,
    hasCustomConfig: existingRegistry?.hasCustomConfig ?? Boolean(existingConfig),
  });
}

export async function getInvitationPageBySlug(
  pageSlug: string,
  options: InvitationPageLookupOptions = {}
): Promise<InvitationPage | null> {
  const seedPage = buildSeedPage(pageSlug);

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return options.includeSeedFallback === false ? null : seedPage;
  }

  try {
    const [registryRecord, configSeed, period] = await Promise.all([
      getRegistryByPageSlug(firestore, pageSlug),
      getConfigByPageSlug(firestore, pageSlug),
      getDisplayPeriodByPageSlug(firestore, pageSlug),
    ]);

    const sourceRecord = buildInvitationPageRecord(pageSlug, configSeed, registryRecord);
    const basePage = sourceRecord?.page ?? seedPage;

    if (!basePage) {
      return null;
    }

    return mergeDisplayPeriod(basePage, period);
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';

    if (
      errorCode === 'permission-denied' &&
      options.retryOnPermissionDenied &&
      (options.retryCount ?? 0) > 0
    ) {
      await wait(options.retryDelayMs ?? 300);
      return getInvitationPageBySlug(pageSlug, {
        ...options,
        retryCount: (options.retryCount ?? 0) - 1,
      });
    }

    if (options.fallbackOnError) {
      console.warn(
        '[invitationPageService] falling back to seed invitation page',
        pageSlug,
        error
      );
      return seedPage;
    }

    console.error('[invitationPageService] failed to load invitation page', error);
    return null;
  }
}

export async function getAllInvitationPages(
  options: InvitationPageLookupOptions = {}
): Promise<InvitationPageSummary[]> {
  const includeSeedPages = options.includeSeedPages !== false;
  const seedPages = includeSeedPages
    ? getAllWeddingPageSeeds().map((seed) =>
        sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(seed))
      )
    : [];

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return options.includeSeedFallback === false ? [] : seedPages.map((page) =>
      toInvitationPageSummary(page, {
        dataSource: 'seed',
        hasCustomConfig: false,
        defaultTheme: DEFAULT_INVITATION_THEME,
        createdAt: null,
        updatedAt: null,
      })
    );
  }

  try {
    const [periodMap, registryMap, configMap] = await Promise.all([
      getDisplayPeriodMap(firestore),
      getRegistryMap(firestore),
      getConfigMap(firestore),
    ]);

    const pageSlugs = new Set<string>([
      ...(includeSeedPages ? getAllWeddingPageSeeds().map((seed) => seed.slug) : []),
      ...registryMap.keys(),
      ...configMap.keys(),
    ]);

    return [...pageSlugs]
      .map((pageSlug) => {
        const sourceRecord = buildInvitationPageRecord(
          pageSlug,
          configMap.get(pageSlug) ?? null,
          registryMap.get(pageSlug) ?? null
        );

        if (!sourceRecord) {
          return null;
        }

        return toInvitationPageSummary(
          mergeDisplayPeriod(sourceRecord.page, periodMap.get(pageSlug) ?? null),
          {
            dataSource: sourceRecord.dataSource,
            hasCustomConfig: sourceRecord.hasCustomConfig,
            defaultTheme:
              registryMap.get(pageSlug)?.defaultTheme ?? DEFAULT_INVITATION_THEME,
            createdAt: registryMap.get(pageSlug)?.createdAt ?? null,
            updatedAt: registryMap.get(pageSlug)?.updatedAt ?? null,
          }
        );
      })
      .filter(
        (page): page is InvitationPageSummary =>
          page !== null
      )
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'));
  } catch (error) {
    if (options.includeSeedFallback === false) {
      console.error('[invitationPageService] failed to load invitation pages', error);
      return [];
    }

    console.warn('[invitationPageService] falling back to seed invitation page list', error);
    return getSeedSummaries();
  }
}

export async function getAllManagedInvitationPages(): Promise<InvitationPageSummary[]> {
  return getAllInvitationPages({
    includeSeedPages: false,
    includeSeedFallback: false,
  });
}

export async function updateInvitationPageVisibility(
  pageSlug: string,
  payload: {
    published: boolean;
    displayPeriodEnabled: boolean;
    displayPeriodStart: Date | null;
    displayPeriodEnd: Date | null;
  }
) {
  const seedPage = buildSeedPage(pageSlug);

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('데이터 저장소 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  const existingConfig = await getConfigByPageSlug(firestore, pageSlug);
  const existingRegistry = await getRegistryByPageSlug(firestore, pageSlug);

  if (!seedPage && !existingConfig) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  await upsertRegistryRecord(firestore, pageSlug, {
    published: payload.published,
    defaultTheme: existingRegistry?.defaultTheme,
    hasCustomConfig: Boolean(existingConfig),
  });

  await syncDisplayPeriod(firestore, pageSlug, payload);
}
