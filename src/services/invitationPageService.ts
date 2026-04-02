import {
  createInvitationPageFromSeed,
  getAllWeddingPageSeeds,
  getWeddingPageBySlug,
} from '@/config/weddingPages';
import { buildInvitationVariants } from '@/lib/invitationVariants';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import type { InvitationPage, InvitationPageSeed } from '@/types/invitationPage';
import { sanitizeHeartIconPlaceholdersDeep } from '@/utils/textSanitizers';

export interface InvitationPageSummary {
  slug: string;
  displayName: string;
  description: string;
  date: string;
  venue: string;
  published: boolean;
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
  hasCustomConfig: boolean;
  dataSource: 'seed' | 'firestore';
}

export interface InvitationPageLookupOptions {
  includeSeedFallback?: boolean;
  fallbackOnError?: boolean;
  retryOnPermissionDenied?: boolean;
  retryCount?: number;
  retryDelayMs?: number;
}

type FirestoreState = {
  db: any;
  modules: {
    collection: any;
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
  hasCustomConfig: boolean;
  editorTokenHash: string | null;
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

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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

  const supportedVariants = buildInvitationVariants(slug, displayName);

  const normalizedVariants =
    (() => {
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
  options: { dataSource: 'seed' | 'firestore'; hasCustomConfig: boolean }
): InvitationPageSummary {
  return {
    slug: page.slug,
    displayName: page.displayName,
    description: page.description,
    date: page.date,
    venue: page.venue,
    published: page.published,
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
      toInvitationPageSummary(page, { dataSource: 'seed', hasCustomConfig: false })
    );
}

async function ensureFirestoreState(): Promise<FirestoreState | null> {
  if (!USE_FIREBASE) {
    return null;
  }

  const firebase = await ensureFirebaseInit();
  if (!firebase.db) {
    throw new Error('Firestore is not initialized.');
  }

  const firestoreModule = await import('firebase/firestore');

  return {
    db: firebase.db,
    modules: {
      collection: firestoreModule.collection,
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
    hasCustomConfig?: boolean;
    editorTokenHash?: string | null;
  }
) {
  const existing = await getRegistryByPageSlug(firestore, pageSlug);
  const now = new Date();

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, PAGE_REGISTRY_COLLECTION, pageSlug),
    {
      pageSlug,
      published: payload.published ?? existing?.published ?? true,
      hasCustomConfig:
        payload.hasCustomConfig ?? existing?.hasCustomConfig ?? false,
      editorTokenHash:
        payload.editorTokenHash ?? existing?.editorTokenHash ?? null,
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

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return fallbackConfig
      ? {
          slug: pageSlug,
          config: fallbackConfig,
          published: true,
          hasCustomConfig: false,
          dataSource: 'seed',
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

    return {
      slug: pageSlug,
      config: editableConfig,
      published: sourceRecord.page.published,
      hasCustomConfig: sourceRecord.hasCustomConfig,
      dataSource: sourceRecord.dataSource,
    };
  } catch (error) {
    console.error('[invitationPageService] failed to load editable config', error);
    return fallbackConfig
      ? {
          slug: pageSlug,
          config: fallbackConfig,
          published: true,
          hasCustomConfig: false,
          dataSource: 'seed',
        }
      : null;
  }
}

export async function saveInvitationPageConfig(
  config: InvitationPageSeed,
  options: {
    published?: boolean;
    editorTokenHash?: string | null;
  } = {}
) {
  const normalizedConfig = mergeInvitationPageSeed(
    getWeddingPageBySlug(config.slug),
    config as unknown as Record<string, any>,
    config.slug
  );

  if (!normalizedConfig) {
    throw new Error('Invitation page config is invalid.');
  }

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not available.');
  }

  const existingConfig = await getConfigByPageSlug(firestore, normalizedConfig.slug);
  const now = new Date();

  await firestore.modules.setDoc(
    firestore.modules.doc(firestore.db, PAGE_CONFIG_COLLECTION, normalizedConfig.slug),
    {
      ...normalizedConfig,
      editorTokenHash: options.editorTokenHash ?? null,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await upsertRegistryRecord(firestore, normalizedConfig.slug, {
    published: options.published ?? true,
    hasCustomConfig: true,
    editorTokenHash: options.editorTokenHash ?? null,
  });

  return existingConfig ?? normalizedConfig;
}

export async function restoreInvitationPageConfig(
  pageSlug: string,
  options: {
    published?: boolean;
    editorTokenHash?: string | null;
  } = {}
) {
  const seed = getWeddingPageBySlug(pageSlug);
  if (!seed) {
    throw new Error('Unknown invitation page slug.');
  }

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not available.');
  }

  await upsertRegistryRecord(firestore, pageSlug, {
    published: options.published ?? true,
    hasCustomConfig: false,
    editorTokenHash: options.editorTokenHash ?? null,
  });
}

export async function setInvitationPagePublished(
  pageSlug: string,
  published: boolean,
  options: {
    editorTokenHash?: string | null;
  } = {}
) {
  const seed = getWeddingPageBySlug(pageSlug);

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not available.');
  }

  const existingConfig = await getConfigByPageSlug(firestore, pageSlug);
  const existingRegistry = await getRegistryByPageSlug(firestore, pageSlug);

  if (!seed && !existingConfig && !existingRegistry) {
    throw new Error('Unknown invitation page slug.');
  }

  await upsertRegistryRecord(firestore, pageSlug, {
    published,
    hasCustomConfig: existingRegistry?.hasCustomConfig ?? Boolean(existingConfig),
    editorTokenHash: options.editorTokenHash ?? null,
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
  const seedPages = getAllWeddingPageSeeds().map((seed) =>
    sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(seed))
  );

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return options.includeSeedFallback === false ? [] : seedPages.map((page) =>
      toInvitationPageSummary(page, { dataSource: 'seed', hasCustomConfig: false })
    );
  }

  try {
    const [periodMap, registryMap, configMap] = await Promise.all([
      getDisplayPeriodMap(firestore),
      getRegistryMap(firestore),
      getConfigMap(firestore),
    ]);

    const pageSlugs = new Set<string>([
      ...getAllWeddingPageSeeds().map((seed) => seed.slug),
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
    throw new Error('Firestore is not available.');
  }

  const existingConfig = await getConfigByPageSlug(firestore, pageSlug);

  if (!seedPage && !existingConfig) {
    throw new Error('Unknown invitation page slug.');
  }

  await upsertRegistryRecord(firestore, pageSlug, {
    published: payload.published,
    hasCustomConfig: Boolean(existingConfig),
  });

  await syncDisplayPeriod(firestore, pageSlug, payload);
}
