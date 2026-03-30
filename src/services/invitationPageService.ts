import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import { buildInvitationVariants } from '@/lib/invitationVariants';
import type { InvitationPage } from '@/types/invitationPage';

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

type FirestoreState = {
  db: any;
  modules: {
    collection: any;
    doc: any;
    getDoc: any;
    getDocs: any;
    orderBy: any;
    query: any;
    setDoc: any;
    updateDoc: any;
  };
};

function toDate(value: unknown): Date | null {
  if (!value) {
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
    return `${groomName} ♥ ${brideName}`;
  }

  return groomName || brideName || '모바일 청첩장';
}

function normalizeInvitationPage(pageSlug: string, data: Record<string, any>): InvitationPage {
  const groomName = data.groomName ?? data.couple?.groom?.name ?? '';
  const brideName = data.brideName ?? data.couple?.bride?.name ?? '';
  const displayName = data.displayName ?? buildDisplayName(groomName, brideName);

  return {
    slug: pageSlug,
    displayName,
    description: data.description ?? '',
    date: data.date ?? '',
    venue: data.venue ?? '',
    groomName,
    brideName,
    couple: data.couple ?? {
      groom: { name: groomName },
      bride: { name: brideName },
    },
    weddingDateTime: {
      year: Number(data.weddingDateTime?.year ?? new Date().getFullYear()),
      month: Number(data.weddingDateTime?.month ?? 0),
      day: Number(data.weddingDateTime?.day ?? 1),
      hour: Number(data.weddingDateTime?.hour ?? 12),
      minute: Number(data.weddingDateTime?.minute ?? 0),
    },
    published: data.published === true,
    displayPeriodEnabled: data.displayPeriodEnabled === true,
    displayPeriodStart: toDate(data.displayPeriodStart),
    displayPeriodEnd: toDate(data.displayPeriodEnd),
    metadata: {
      title: data.metadata?.title ?? `${displayName} 결혼식에 초대합니다`,
      description: data.metadata?.description ?? data.description ?? '',
      keywords: Array.isArray(data.metadata?.keywords) ? data.metadata.keywords : [],
      images: {
        wedding: data.metadata?.images?.wedding ?? '',
        favicon: data.metadata?.images?.favicon ?? '/images/favicon.ico',
      },
      openGraph: {
        title: data.metadata?.openGraph?.title ?? `${displayName} 결혼식 초대`,
        description: data.metadata?.openGraph?.description ?? data.description ?? '',
      },
      twitter: {
        title: data.metadata?.twitter?.title ?? `${displayName} 결혼식 초대`,
        description: data.metadata?.twitter?.description ?? data.description ?? '',
      },
    },
    pageData: data.pageData
      ? {
          ...data.pageData,
          groom: data.pageData.groom ?? data.couple?.groom ?? undefined,
          bride: data.pageData.bride ?? data.couple?.bride ?? undefined,
          venueName: data.pageData.venueName ?? data.venue ?? '',
        }
      : undefined,
    variants: buildInvitationVariants(pageSlug, displayName),
  };
}

async function ensureFirestoreState(): Promise<FirestoreState | null> {
  if (!USE_FIREBASE) {
    return null;
  }

  const firebase = await ensureFirebaseInit();
  if (!firebase.db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  const firestoreModule = await import('firebase/firestore');

  return {
    db: firebase.db,
    modules: {
      collection: firestoreModule.collection,
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      getDocs: firestoreModule.getDocs,
      orderBy: firestoreModule.orderBy,
      query: firestoreModule.query,
      setDoc: firestoreModule.setDoc,
      updateDoc: firestoreModule.updateDoc,
    },
  };
}

export async function getInvitationPageBySlug(
  pageSlug: string
): Promise<InvitationPage | null> {
  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return null;
  }

  try {
    const snapshot = await firestore.modules.getDoc(
      firestore.modules.doc(firestore.db, 'invitation-pages', pageSlug)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return normalizeInvitationPage(snapshot.id, snapshot.data());
  } catch (error) {
    console.error('[invitationPageService] failed to load page', error);
    return null;
  }
}

export async function getAllInvitationPages(): Promise<InvitationPageSummary[]> {
  const firestore = await ensureFirestoreState();
  if (!firestore) {
    return [];
  }

  try {
    const snapshot = await firestore.modules.getDocs(
      firestore.modules.collection(firestore.db, 'invitation-pages')
    );

    const invitationPages: InvitationPage[] = snapshot.docs
      .map((docSnapshot: { id: string; data: () => Record<string, any> }) =>
        normalizeInvitationPage(docSnapshot.id, docSnapshot.data())
      )
      .sort((left: InvitationPage, right: InvitationPage) =>
        left.displayName.localeCompare(right.displayName, 'ko')
      );

    return invitationPages.map((page: InvitationPage) => ({
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
      }));
  } catch (error) {
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
    throw new Error('Firestore를 사용할 수 없습니다.');
  }

  const docRef = firestore.modules.doc(firestore.db, 'invitation-pages', pageSlug);

  await firestore.modules.updateDoc(docRef, {
    published: payload.published,
    displayPeriodEnabled: payload.displayPeriodEnabled,
    displayPeriodStart: payload.displayPeriodStart,
    displayPeriodEnd: payload.displayPeriodEnd,
    updatedAt: new Date(),
  });
}
