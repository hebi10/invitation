import {
  createInvitationPageFromSeed,
  getAllWeddingPageSeeds,
  getWeddingPageBySlug,
} from '@/config/weddingPages';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import { buildInvitationVariants } from '@/lib/invitationVariants';
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
}

type FirestoreState = {
  db: any;
  modules: {
    collection: any;
    doc: any;
    getDoc: any;
    getDocs: any;
    setDoc: any;
  };
};

const INVITATION_COLLECTION = 'invitation-pages';

function hasOwn(data: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key);
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

function buildDisplayName(groomName: string, brideName: string) {
  if (groomName && brideName) {
    return `${groomName} & ${brideName}`;
  }

  return groomName || brideName || 'Wedding Invitation';
}

function buildSeedFallbackInvitationPage(pageSlug: string): InvitationPage | null {
  const seed = getWeddingPageBySlug(pageSlug);
  return seed ? createInvitationPageFromSeed(seed) : null;
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

function toFirestoreInvitationPayload(page: InvitationPage): Record<string, any> {
  return {
    displayName: page.displayName,
    description: page.description,
    date: page.date,
    venue: page.venue,
    groomName: page.groomName,
    brideName: page.brideName,
    couple: page.couple,
    weddingDateTime: page.weddingDateTime,
    published: page.published,
    displayPeriodEnabled: page.displayPeriodEnabled,
    displayPeriodStart: page.displayPeriodStart,
    displayPeriodEnd: page.displayPeriodEnd,
    metadata: page.metadata,
    pageData: page.pageData ?? null,
    variants: page.variants,
  };
}

function normalizeInvitationPage(
  pageSlug: string,
  data: Record<string, any>,
  seedFallback: InvitationPage | null = null
): InvitationPage {
  const groomName =
    data.groomName ?? data.couple?.groom?.name ?? seedFallback?.groomName ?? '';
  const brideName =
    data.brideName ?? data.couple?.bride?.name ?? seedFallback?.brideName ?? '';
  const displayName =
    data.displayName ?? seedFallback?.displayName ?? buildDisplayName(groomName, brideName);
  const fallbackWeddingDateTime = seedFallback?.weddingDateTime ?? {
    year: new Date().getFullYear(),
    month: 0,
    day: 1,
    hour: 12,
    minute: 0,
  };

  const normalizedPage: InvitationPage = {
    slug: pageSlug,
    displayName,
    description: data.description ?? seedFallback?.description ?? '',
    date: data.date ?? seedFallback?.date ?? '',
    venue: data.venue ?? seedFallback?.venue ?? '',
    groomName,
    brideName,
    couple: data.couple ?? {
      groom: seedFallback?.couple.groom ?? { name: groomName },
      bride: seedFallback?.couple.bride ?? { name: brideName },
    },
    weddingDateTime: {
      year: Number(data.weddingDateTime?.year ?? fallbackWeddingDateTime.year),
      month: Number(data.weddingDateTime?.month ?? fallbackWeddingDateTime.month),
      day: Number(data.weddingDateTime?.day ?? fallbackWeddingDateTime.day),
      hour: Number(data.weddingDateTime?.hour ?? fallbackWeddingDateTime.hour),
      minute: Number(data.weddingDateTime?.minute ?? fallbackWeddingDateTime.minute),
    },
    published: hasOwn(data, 'published')
      ? data.published === true
      : (seedFallback?.published ?? true),
    displayPeriodEnabled: hasOwn(data, 'displayPeriodEnabled')
      ? data.displayPeriodEnabled === true
      : (seedFallback?.displayPeriodEnabled ?? false),
    displayPeriodStart: hasOwn(data, 'displayPeriodStart')
      ? toDate(data.displayPeriodStart)
      : (seedFallback?.displayPeriodStart ?? null),
    displayPeriodEnd: hasOwn(data, 'displayPeriodEnd')
      ? toDate(data.displayPeriodEnd)
      : (seedFallback?.displayPeriodEnd ?? null),
    metadata: {
      title:
        data.metadata?.title ??
        seedFallback?.metadata.title ??
        `${displayName} Wedding Invitation`,
      description:
        data.metadata?.description ??
        seedFallback?.metadata.description ??
        data.description ??
        seedFallback?.description ??
        '',
      keywords: Array.isArray(data.metadata?.keywords)
        ? data.metadata.keywords
        : (seedFallback?.metadata.keywords ?? []),
      images: {
        wedding:
          data.metadata?.images?.wedding ?? seedFallback?.metadata.images.wedding ?? '',
        favicon:
          data.metadata?.images?.favicon ??
          seedFallback?.metadata.images.favicon ??
          '/images/favicon.ico',
      },
      openGraph: {
        title:
          data.metadata?.openGraph?.title ??
          seedFallback?.metadata.openGraph.title ??
          `${displayName} Wedding Invitation`,
        description:
          data.metadata?.openGraph?.description ??
          seedFallback?.metadata.openGraph.description ??
          data.description ??
          seedFallback?.description ??
          '',
      },
      twitter: {
        title:
          data.metadata?.twitter?.title ??
          seedFallback?.metadata.twitter.title ??
          `${displayName} Wedding Invitation`,
        description:
          data.metadata?.twitter?.description ??
          seedFallback?.metadata.twitter.description ??
          data.description ??
          seedFallback?.description ??
          '',
      },
    },
    pageData: data.pageData || seedFallback?.pageData
      ? {
          ...(seedFallback?.pageData ?? {}),
          ...(data.pageData ?? {}),
          groom:
            data.pageData?.groom ??
            seedFallback?.pageData?.groom ??
            data.couple?.groom ??
            seedFallback?.couple.groom ??
            undefined,
          bride:
            data.pageData?.bride ??
            seedFallback?.pageData?.bride ??
            data.couple?.bride ??
            seedFallback?.couple.bride ??
            undefined,
          venueName:
            data.pageData?.venueName ??
            seedFallback?.pageData?.venueName ??
            data.venue ??
            seedFallback?.venue ??
            '',
        }
      : undefined,
    variants:
      data.variants ?? seedFallback?.variants ?? buildInvitationVariants(pageSlug, displayName),
  };

  return sanitizeHeartIconPlaceholdersDeep(normalizedPage);
}

function getSeedSummaries(): InvitationPageSummary[] {
  return getAllWeddingPageSeeds()
    .map((seed) => createInvitationPageFromSeed(seed))
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
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      getDocs: firestoreModule.getDocs,
      setDoc: firestoreModule.setDoc,
    },
  };
}

export async function getInvitationPageBySlug(
  pageSlug: string,
  options: InvitationPageLookupOptions = {}
): Promise<InvitationPage | null> {
  const seedFallback = buildSeedFallbackInvitationPage(pageSlug);
  const firestore = await ensureFirestoreState();

  if (!firestore) {
    return options.includeSeedFallback
      ? (seedFallback ? sanitizeHeartIconPlaceholdersDeep(seedFallback) : null)
      : null;
  }

  try {
    const snapshot = await firestore.modules.getDoc(
      firestore.modules.doc(firestore.db, INVITATION_COLLECTION, pageSlug)
    );

    if (!snapshot.exists()) {
      return options.includeSeedFallback
        ? (seedFallback ? sanitizeHeartIconPlaceholdersDeep(seedFallback) : null)
        : null;
    }

    return normalizeInvitationPage(snapshot.id, snapshot.data(), seedFallback);
  } catch (error) {
    if (options.includeSeedFallback && seedFallback) {
      console.warn('[invitationPageService] falling back to local seed for page', pageSlug);
      return sanitizeHeartIconPlaceholdersDeep(seedFallback);
    }

    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';

    if (seedFallback && errorCode === 'permission-denied') {
      return null;
    }

    console.error('[invitationPageService] failed to load page', error);
    return null;
  }
}

export async function getAllInvitationPages(
  options: InvitationPageLookupOptions = {}
): Promise<InvitationPageSummary[]> {
  const firestore = await ensureFirestoreState();

  if (!firestore) {
    return options.includeSeedFallback ? getSeedSummaries() : [];
  }

  try {
    const snapshot = await firestore.modules.getDocs(
      firestore.modules.collection(firestore.db, INVITATION_COLLECTION)
    );

    const pageMap = new Map<string, InvitationPage>();

    if (options.includeSeedFallback) {
      getAllWeddingPageSeeds()
        .map((seed) => createInvitationPageFromSeed(seed))
        .forEach((page) => {
          pageMap.set(page.slug, page);
        });
    }

    snapshot.docs.forEach((docSnapshot: { id: string; data: () => Record<string, any> }) => {
      pageMap.set(
        docSnapshot.id,
        normalizeInvitationPage(
          docSnapshot.id,
          docSnapshot.data(),
          buildSeedFallbackInvitationPage(docSnapshot.id)
        )
      );
    });

    return [...pageMap.values()]
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'ko'))
      .map(toInvitationPageSummary);
  } catch (error) {
    if (options.includeSeedFallback) {
      console.warn(
        '[invitationPageService] falling back to local invitation seeds for page list'
      );
      return getSeedSummaries();
    }

    console.error('[invitationPageService] failed to load page list', error);
    return [];
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
  const firestore = await ensureFirestoreState();
  if (!firestore) {
    throw new Error('Firestore is not available.');
  }

  const docRef = firestore.modules.doc(firestore.db, INVITATION_COLLECTION, pageSlug);
  const seedFallback = buildSeedFallbackInvitationPage(pageSlug);

  await firestore.modules.setDoc(
    docRef,
    {
      ...(seedFallback ? toFirestoreInvitationPayload(seedFallback) : {}),
      published: payload.published,
      displayPeriodEnabled: payload.displayPeriodEnabled,
      displayPeriodStart: payload.displayPeriodStart,
      displayPeriodEnd: payload.displayPeriodEnd,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}
