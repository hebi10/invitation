import {
  createInvitationPageFromSeed,
  getAllWeddingPageSeeds,
  getWeddingPageBySlug,
} from '@/config/weddingPages';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import type { InvitationPage } from '@/types/invitationPage';
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
    deleteDoc: any;
    doc: any;
    getDoc: any;
    getDocs: any;
    query: any;
    setDoc: any;
    where: any;
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

const DISPLAY_PERIOD_COLLECTION = 'display-periods';

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  const pageSlug = typeof data.pageSlug === 'string' && data.pageSlug.trim()
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

function toInvitationPageSummary(page: InvitationPage): InvitationPageSummary {
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
  };
}

function getSeedSummaries(): InvitationPageSummary[] {
  return getAllWeddingPageSeeds()
    .map((seed) => sanitizeHeartIconPlaceholdersDeep(createInvitationPageFromSeed(seed)))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'))
    .map(toInvitationPageSummary);
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

export async function getInvitationPageBySlug(
  pageSlug: string,
  options: InvitationPageLookupOptions = {}
): Promise<InvitationPage | null> {
  const seedPage = buildSeedPage(pageSlug);
  if (!seedPage) {
    return null;
  }

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return options.includeSeedFallback === false ? null : seedPage;
  }

  try {
    const period = await getDisplayPeriodByPageSlug(firestore, pageSlug);
    return mergeDisplayPeriod(seedPage, period);
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

    console.error('[invitationPageService] failed to load display-period', error);
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
    return options.includeSeedFallback === false ? [] : seedPages.map(toInvitationPageSummary);
  }

  try {
    const periodMap = await getDisplayPeriodMap(firestore);
    return seedPages
      .map((page) => mergeDisplayPeriod(page, periodMap.get(page.slug) ?? null))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'))
      .map(toInvitationPageSummary);
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
  if (!seedPage) {
    throw new Error('Unknown invitation page slug.');
  }

  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not available.');
  }

  await syncDisplayPeriod(firestore, pageSlug, payload);
}
