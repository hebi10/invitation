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
  createInvitationPageDisplayName,
  generateInvitationPageSlugSuffix,
  mergeInvitationPageSeed,
  normalizeInvitationConfigSeed,
    normalizeInvitationPageDisplayPeriod,
    normalizeInvitationPageRegistryRecord,
    normalizeInvitationPageSlugInput,
    stripUndefinedDeep,
  type InvitationPageDisplayPeriodRecord as DisplayPeriodRecord,
  type InvitationPageRegistryRecord,
} from '@/lib/invitationPagePersistence';
import {
  getInvitationPageSlugValidationErrorMessage,
  type InvitationPageSlugAvailabilityReason,
  validateInvitationPageSlugBase,
} from '@/lib/invitationPageSlug';
import {
  DEFAULT_INVITATION_PRODUCT_TIER,
  DEFAULT_INVITATION_THEME,
  normalizeInvitationProductTier,
  resolveInvitationFeatures,
} from '@/lib/invitationProducts';
import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';
import {
  normalizeInvitationTheme,
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

function buildSamplePage(pageSlug: string): InvitationPage | null {
  const sample = getWeddingPageBySlug(pageSlug);
  if (!sample) {
    return null;
  }

  return sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(sample));
}

function normalizeConfigSeed(
  docId: string,
  data: Record<string, any>
): InvitationPageSeed | null {
  return normalizeInvitationConfigSeed(
    docId,
    data,
    getWeddingPageBySlug(docId) ?? undefined
  );
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
  nextSeed.displayName = createInvitationPageDisplayName(
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
  const slugValidation = validateInvitationPageSlugBase(slugBase);
  if (!slugValidation.isValid) {
    throw new Error(getInvitationPageSlugValidationErrorMessage(slugValidation.reason));
  }

  const normalizedSlugBase = slugValidation.normalizedSlugBase;

  if (!(await isInvitationPageSlugTaken(db, normalizedSlugBase))) {
    return normalizedSlugBase;
  }

  let nextSlug = `${normalizedSlugBase}-${generateInvitationPageSlugSuffix()}`;

  while (await isInvitationPageSlugTaken(db, nextSlug)) {
    nextSlug = `${normalizedSlugBase}-${generateInvitationPageSlugSuffix()}`;
  }

  return nextSlug;
}

export type ServerInvitationPageSlugAvailability = {
  normalizedSlugBase: string;
  available: boolean;
  reason: InvitationPageSlugAvailabilityReason;
};

export async function getServerInvitationPageSlugAvailability(
  slugBase: string
): Promise<ServerInvitationPageSlugAvailability> {
  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const slugValidation = validateInvitationPageSlugBase(slugBase);
  if (!slugValidation.isValid) {
    return {
      normalizedSlugBase: slugValidation.normalizedSlugBase,
      available: false,
      reason: slugValidation.reason ?? 'invalid',
    };
  }

  const taken = await isInvitationPageSlugTaken(db, slugValidation.normalizedSlugBase);
  return {
    normalizedSlugBase: slugValidation.normalizedSlugBase,
    available: !taken,
    reason: taken ? 'taken' : 'ok',
  };
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
    const normalized = normalizeInvitationPageDisplayPeriod(
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
    const normalized = normalizeInvitationPageDisplayPeriod(
      docSnapshot.id,
      docSnapshot.data()
    );
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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

  return normalizeInvitationPageRegistryRecord(
    normalizedPageSlug,
    snapshot.data() ?? {}
  );
}

async function getConfigByPageSlug(pageSlug: string) {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
    ? normalizeInvitationPageRegistryRecord(
        normalizedPageSlug,
        existingSnapshot.data() ?? {}
      )
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
  if (!normalizedPageSlug) {
    return null;
  }

  return getWeddingPageBySlug(normalizedPageSlug) ?? null;
}

export async function getServerInvitationPageOrSampleSeed(
  pageSlug: string | null | undefined
) {
  const normalizedPageSlug = normalizeInvitationPageSlugInput(pageSlug);
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
