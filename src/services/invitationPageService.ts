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
import {
  createInvitationPageDisplayName,
  mergeInvitationPageSeed,
  type InvitationPageDisplayPeriodRecord as DisplayPeriodRecord,
  type InvitationPageRegistryRecord,
} from '@/lib/invitationPagePersistence';
import {
  normalizeInvitationTheme,
  readString,
} from '@/lib/invitationPageNormalization';
import {
  buildInvitationTemplateDefinitions,
  DEFAULT_INVITATION_PRODUCT_TIER,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
import { DEFAULT_EVENT_TYPE, normalizeEventTypeKey, type EventTypeKey } from '@/lib/eventTypes';
import {
  clampInvitationMusicVolume,
  DEFAULT_INVITATION_MUSIC_VOLUME,
} from '@/lib/musicLibrary';
import type {
  InvitationFeatureFlags,
  InvitationPage,
  InvitationProductTier,
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';
import {
  clientInvitationPageRepository,
  type StoredInvitationPageConfigRecord,
} from '@/services/repositories/invitationPageRepository';

import { getCurrentFirebaseIdToken } from './adminAuth';

export { normalizeInvitationPageSlugBase } from '@/lib/invitationPagePersistence';

export interface InvitationPageSummary {
  slug: string;
  eventType: EventTypeKey;
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

type AdminInvitationPagesApiResponse = {
  success?: boolean;
  pages?: Array<Record<string, unknown>>;
  error?: string;
};

export interface CreateInvitationPageDraftInput {
  seedSlug: string;
  slugBase: string;
  eventType?: EventTypeKey;
  groomName?: string;
  brideName?: string;
  published?: boolean;
  defaultTheme?: InvitationThemeKey;
  productTier?: InvitationProductTier;
  initialDisplayPeriodMonths?: number;
}

export interface CreateInvitationPageDraftResult {
  slug: string;
  config: InvitationPageSeed;
}

export interface InvitationPageLookupOptions {
  includeSeedFallback?: boolean;
  includeSeedPages?: boolean;
  allowSeedFallbackWithFirestore?: boolean;
  requirePublicAccess?: boolean;
  fallbackOnError?: boolean;
  retryOnPermissionDenied?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
}

type FirestoreState = true;

type BuiltInvitationPageRecord = {
  page: InvitationPage;
  dataSource: 'seed' | 'firestore';
  hasCustomConfig: boolean;
};

function readServiceDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function normalizeAdminInvitationPageSummary(
  input: Record<string, unknown>
): InvitationPageSummary | null {
  const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
  if (!slug) {
    return null;
  }

  const productTier = normalizeInvitationProductTier(
    input.productTier,
    DEFAULT_INVITATION_PRODUCT_TIER
  );

  return {
    slug,
    eventType: normalizeEventTypeKey(input.eventType, DEFAULT_EVENT_TYPE),
    displayName:
      typeof input.displayName === 'string' && input.displayName.trim()
        ? input.displayName.trim()
        : slug,
    description: typeof input.description === 'string' ? input.description : '',
    date: typeof input.date === 'string' ? input.date : '',
    venue: typeof input.venue === 'string' ? input.venue : '',
    createdAt: readServiceDate(input.createdAt),
    updatedAt: readServiceDate(input.updatedAt),
    published: input.published === true,
    defaultTheme: normalizeInvitationTheme(input.defaultTheme),
    productTier,
    features: resolveInvitationFeatures(
      productTier,
      typeof input.features === 'object' && input.features !== null
        ? (input.features as Record<string, unknown>)
        : undefined
    ),
    displayPeriodEnabled: input.displayPeriodEnabled === true,
    displayPeriodStart: readServiceDate(input.displayPeriodStart),
    displayPeriodEnd: readServiceDate(input.displayPeriodEnd),
    variants:
      typeof input.variants === 'object' && input.variants !== null
        ? (input.variants as InvitationPage['variants'])
        : {},
    dataSource: 'firestore' as const,
    hasCustomConfig: input.hasCustomConfig === true,
  } satisfies InvitationPageSummary;
}

async function getAdminAuthHeaders() {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

async function fetchAdminManagedInvitationPages() {
  const response = await fetch('/api/admin/pages', {
    method: 'GET',
    headers: await getAdminAuthHeaders(),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as
    | AdminInvitationPagesApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '청첩장 페이지 목록을 불러오지 못했습니다.'
    );
  }

  return Array.isArray(payload?.pages)
    ? payload.pages
        .map((page) => normalizeAdminInvitationPageSummary(page))
        .filter((page): page is InvitationPageSummary => page !== null)
    : [];
}

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

function buildSeedPage(pageSlug: string): InvitationPage | null {
  const seed = getWeddingPageBySlug(pageSlug);
  if (!seed) {
    return null;
  }

  return sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(seed));
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
    eventType: normalizeEventTypeKey(page.eventType, DEFAULT_EVENT_TYPE),
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
    eventType: EventTypeKey;
    groomName: string;
    brideName: string;
    productTier: InvitationProductTier;
    theme: InvitationThemeKey;
  }
) {
  const nextSeed = cloneInvitationPageSeed(seed);
  const displayName = createInvitationPageDisplayName('', '');
  const features = resolveInvitationFeatures(overrides.productTier, seed.features);

  nextSeed.slug = overrides.slug;
  nextSeed.eventType = overrides.eventType;
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
  nextSeed.metadata.images.social = '';
  nextSeed.metadata.images.kakaoCard = '';
  nextSeed.metadata.openGraph.title = '';
  nextSeed.metadata.openGraph.description = '';
  nextSeed.metadata.twitter.title = '';
  nextSeed.metadata.twitter.description = '';
  nextSeed.metadata.keywords = [overrides.groomName, overrides.brideName, '청첩장'];
  nextSeed.musicEnabled = false;
  nextSeed.musicVolume = clampInvitationMusicVolume(
    nextSeed.musicVolume,
    DEFAULT_INVITATION_MUSIC_VOLUME
  );
  nextSeed.musicCategoryId = '';
  nextSeed.musicTrackId = '';
  nextSeed.musicStoragePath = '';
  nextSeed.musicUrl = '';
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
  return clientInvitationPageRepository.isAvailable() ? true : null;
}

function canUseSeedFallback(
  options: InvitationPageLookupOptions,
  firestoreAvailable: boolean
) {
  if (options.includeSeedFallback === false) {
    return false;
  }

  if (!firestoreAvailable) {
    return true;
  }

  return options.allowSeedFallbackWithFirestore !== false;
}

function readRepositoryErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
}

function isPublicInvitationPage(page: InvitationPage) {
  return getInvitationPublicAccessState(page).isPublic;
}

async function getDisplayPeriodMap(_firestore: FirestoreState) {
  return clientInvitationPageRepository.listDisplayPeriodMap();
}

async function getDisplayPeriodByPageSlug(
  _firestore: FirestoreState,
  pageSlug: string
) {
  return clientInvitationPageRepository.findDisplayPeriodBySlug(pageSlug);
}

async function getRegistryMap(_firestore: FirestoreState) {
  return clientInvitationPageRepository.listRegistryMap();
}

async function getRegistryByPageSlug(
  _firestore: FirestoreState,
  pageSlug: string
) {
  return clientInvitationPageRepository.findRegistryBySlug(pageSlug);
}

async function getConfigMap(_firestore: FirestoreState) {
  return clientInvitationPageRepository.listConfigMap();
}

async function getConfigByPageSlug(
  _firestore: FirestoreState,
  pageSlug: string
) {
  return clientInvitationPageRepository.findConfigBySlug(pageSlug);
}

async function createUniqueInvitationPageSlug(
  _firestore: FirestoreState,
  slugBase: string
) {
  return clientInvitationPageRepository.createUniqueSlug(slugBase);
}

function buildInvitationPageRecord(
  pageSlug: string,
  configRecord: StoredInvitationPageConfigRecord | null,
  registryRecord: InvitationPageRegistryRecord | null,
  options: {
    includeImplicitSeedFallback?: boolean;
  } = {}
): BuiltInvitationPageRecord | null {
  const seed = getWeddingPageBySlug(pageSlug);
  const configSeed = configRecord?.config ?? null;
  const hasCustomConfig = registryRecord?.hasCustomConfig ?? Boolean(configRecord);
  const canUseSeedSource =
    Boolean(seed) &&
    (options.includeImplicitSeedFallback !== false || Boolean(registryRecord));
  const selectedSeed =
    hasCustomConfig && configSeed
      ? configSeed
      : configSeed && !seed
        ? configSeed
        : canUseSeedSource
          ? seed
          : null;

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
  _firestore: FirestoreState,
  pageSlug: string,
  payload: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
    hasCustomConfig?: boolean;
  }
) {
  await clientInvitationPageRepository.upsertRegistryBySlug(pageSlug, payload);
}

async function syncDisplayPeriod(
  _firestore: FirestoreState,
  pageSlug: string,
  payload: {
    displayPeriodEnabled: boolean;
    displayPeriodStart: Date | null;
    displayPeriodEnd: Date | null;
  }
) {
  await clientInvitationPageRepository.syncDisplayPeriodBySlug(pageSlug, payload);
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
        ? sanitizeHeartIconPlaceholdersDeep(configSeed.config)
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
    const errorCode = readRepositoryErrorCode(error);
    if (errorCode === 'permission-denied' || errorCode === 'not-found') {
      console.warn('[invitationPageService] editable config unavailable', {
        pageSlug,
        errorCode,
      });
      return null;
    }

    console.warn('[invitationPageService] failed to load editable config', error);
    return null;
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
  await clientInvitationPageRepository.saveConfig({
    slug: normalizedConfig.slug,
    config: normalizedConfig,
    createdAt: now,
    updatedAt: now,
  });

  await upsertRegistryRecord(firestore, normalizedConfig.slug, {
    published: options.published ?? true,
    defaultTheme: options.defaultTheme ?? DEFAULT_INVITATION_THEME,
    hasCustomConfig: true,
  });

  return existingConfig?.config ?? normalizedConfig;
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
    eventType: normalizeEventTypeKey(input.eventType, DEFAULT_EVENT_TYPE),
    groomName,
    brideName,
    productTier: normalizeInvitationProductTier(
      input.productTier,
      DEFAULT_INVITATION_PRODUCT_TIER
    ),
    theme: normalizeInvitationTheme(input.defaultTheme),
  });
  const now = new Date();

  await clientInvitationPageRepository.saveConfig({
    slug,
    config,
    seedSourceSlug: seed.slug,
    createdAt: now,
    updatedAt: now,
  });

  await upsertRegistryRecord(firestore, slug, {
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

    await syncDisplayPeriod(firestore, slug, {
      displayPeriodEnabled: true,
      displayPeriodStart,
      displayPeriodEnd,
    });
  }

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

export async function setInvitationPageVariantAvailability(
  pageSlug: string,
  variantKey: InvitationVariantKey,
  available: boolean,
  options: {
    published?: boolean;
    defaultTheme?: InvitationThemeKey;
  } = {}
) {
  const editableConfig = await getEditableInvitationPageConfig(pageSlug);

  if (!editableConfig) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  const baseConfig = cloneInvitationPageSeed(editableConfig.config);
  const supportedVariants = buildInvitationVariants(pageSlug, baseConfig.displayName, {
    availability: createInvitationVariantAvailability([]),
  });

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

  await saveInvitationPageConfig(
    {
      ...baseConfig,
      slug: pageSlug,
      variants: nextVariants,
    },
    {
      published: options.published ?? editableConfig.published,
      defaultTheme: options.defaultTheme ?? editableConfig.defaultTheme,
    }
  );
}

export async function getInvitationPageBySlug(
  pageSlug: string,
  options: InvitationPageLookupOptions = {}
): Promise<InvitationPage | null> {
  const seedPage = buildSeedPage(pageSlug);

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return canUseSeedFallback(options, false) ? seedPage : null;
  }

  const shouldUseSeedFallback = canUseSeedFallback(options, true);

  try {
    const [registryRecord, configSeed, period] = await Promise.all([
      getRegistryByPageSlug(firestore, pageSlug),
      getConfigByPageSlug(firestore, pageSlug),
      getDisplayPeriodByPageSlug(firestore, pageSlug),
    ]);

    const sourceRecord = buildInvitationPageRecord(pageSlug, configSeed, registryRecord, {
      includeImplicitSeedFallback: shouldUseSeedFallback,
    });
    const basePage = sourceRecord?.page ?? (shouldUseSeedFallback ? seedPage : null);

    if (!basePage) {
      return null;
    }

    const mergedPage = mergeDisplayPeriod(basePage, period);
    if (options.requirePublicAccess && !isPublicInvitationPage(mergedPage)) {
      return null;
    }

    return mergedPage;
  } catch (error) {
    const errorCode = readRepositoryErrorCode(error);

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

    if (options.fallbackOnError && shouldUseSeedFallback) {
      console.warn(
        '[invitationPageService] falling back to seed invitation page',
        pageSlug,
        error
      );
      return seedPage;
    }

    if (errorCode === 'permission-denied' || errorCode === 'not-found') {
      console.warn('[invitationPageService] invitation page unavailable', {
        pageSlug,
        errorCode,
      });
      return null;
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
  if (typeof window !== 'undefined') {
    return fetchAdminManagedInvitationPages();
  }

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

export async function setInvitationPageProductTier(
  pageSlug: string,
  productTier: InvitationProductTier
) {
  const editableConfig = await getEditableInvitationPageConfig(pageSlug);

  if (!editableConfig) {
    throw new Error('해당 페이지 주소를 찾을 수 없습니다.');
  }

  const features = resolveInvitationFeatures(productTier);

  await saveInvitationPageConfig(
    { ...editableConfig.config, productTier, features },
    {
      published: editableConfig.published,
      defaultTheme: editableConfig.defaultTheme,
    }
  );
}
