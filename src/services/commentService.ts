import { getAllWeddingPageSlugs } from '@/config/weddingPages';
import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';

export interface Comment {
  id: string;
  author: string;
  message: string;
  createdAt: Date;
  pageSlug: string;
  collectionName?: string;
}

export interface CommentInput {
  author: string;
  message: string;
  pageSlug: string;
}

const COLLECTION_NAME = 'comments';
const LEGACY_COLLECTION_PREFIX = 'comments-';

const mockComments = new Map<string, Comment[]>();

type FirestoreModules = {
  addDoc: any;
  collection: any;
  deleteDoc: any;
  doc: any;
  getDocs: any;
  query: any;
  serverTimestamp: any;
  where: any;
};

let firestoreModules: FirestoreModules | null = null;

async function ensureFirestoreModules() {
  if (!USE_FIREBASE) {
    return null;
  }

  const { db } = await ensureFirebaseInit();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  if (!firestoreModules) {
    const firestore = await import('firebase/firestore');
    firestoreModules = {
      addDoc: firestore.addDoc,
      collection: firestore.collection,
      deleteDoc: firestore.deleteDoc,
      doc: firestore.doc,
      getDocs: firestore.getDocs,
      query: firestore.query,
      serverTimestamp: firestore.serverTimestamp,
      where: firestore.where,
    };
  }

  return { db, modules: firestoreModules };
}

function toDate(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = value ? new Date(String(value)) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeComment(
  id: string,
  data: Record<string, any>,
  options: { pageSlug?: string; collectionName?: string } = {}
): Comment {
  return {
    id,
    author: data.author ?? '',
    message: data.message ?? '',
    pageSlug: data.pageSlug ?? options.pageSlug ?? '',
    createdAt: toDate(data.createdAt),
    collectionName: options.collectionName ?? COLLECTION_NAME,
  };
}

function getLegacyCollectionName(pageSlug: string) {
  return `${LEGACY_COLLECTION_PREFIX}${pageSlug}`;
}

function isPermissionDeniedError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code =
    'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';
  const message =
    'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';

  return (
    code === 'permission-denied' ||
    message.toLowerCase().includes('missing or insufficient permissions')
  );
}

function sortComments(comments: Comment[]) {
  return [...comments].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}

function dedupeComments(comments: Comment[]) {
  const seenKeys = new Set<string>();

  return comments.filter((comment) => {
    const key = `${comment.collectionName ?? COLLECTION_NAME}:${comment.id}`;
    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

async function getCollectionComments(
  collectionName: string,
  pageSlug?: string
): Promise<Comment[]> {
  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  try {
    const snapshot = await firestore.modules.getDocs(
      firestore.modules.collection(firestore.db, collectionName)
    );

    return snapshot.docs.map(
      (docSnapshot: { id: string; data: () => Record<string, any> }) =>
        normalizeComment(docSnapshot.id, docSnapshot.data(), {
          pageSlug,
          collectionName,
        })
    );
  } catch (error) {
    console.error(
      `[commentService] failed to load collection ${collectionName}`,
      error
    );
    return [];
  }
}

async function getUnifiedComments(pageSlug?: string): Promise<Comment[]> {
  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  try {
    const collectionRef = firestore.modules.collection(
      firestore.db,
      COLLECTION_NAME
    );
    const snapshot = pageSlug
      ? await firestore.modules.getDocs(
          firestore.modules.query(
            collectionRef,
            firestore.modules.where('pageSlug', '==', pageSlug)
          )
        )
      : await firestore.modules.getDocs(collectionRef);

    return snapshot.docs.map(
      (docSnapshot: { id: string; data: () => Record<string, any> }) =>
        normalizeComment(docSnapshot.id, docSnapshot.data(), {
          pageSlug,
          collectionName: COLLECTION_NAME,
        })
    );
  } catch (error) {
    console.error('[commentService] failed to load unified comments', error);
    return [];
  }
}

export async function addComment(commentData: CommentInput): Promise<void> {
  const payload = {
    author: commentData.author.trim(),
    message: commentData.message.trim(),
    pageSlug: commentData.pageSlug.trim(),
  };

  if (!payload.author || !payload.message || !payload.pageSlug) {
    throw new Error('Required comment fields are missing.');
  }

  if (!USE_FIREBASE) {
    const nextComment: Comment = {
      id: `mock-${Date.now()}`,
      ...payload,
      createdAt: new Date(),
      collectionName: COLLECTION_NAME,
    };
    const existing = mockComments.get(payload.pageSlug) ?? [];
    mockComments.set(payload.pageSlug, [nextComment, ...existing]);
    return;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  const documentData = {
    ...payload,
    createdAt: firestore.modules.serverTimestamp(),
  };

  try {
    await firestore.modules.addDoc(
      firestore.modules.collection(firestore.db, COLLECTION_NAME),
      documentData
    );
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      throw error;
    }

    console.warn(
      `[commentService] unified comments write denied for ${payload.pageSlug}, falling back to legacy collection`,
      error
    );

    await firestore.modules.addDoc(
      firestore.modules.collection(
        firestore.db,
        getLegacyCollectionName(payload.pageSlug)
      ),
      documentData
    );
  }
}

export async function getComments(pageSlug: string): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    return sortComments([...(mockComments.get(pageSlug) ?? [])]);
  }

  const [unifiedComments, legacyComments] = await Promise.all([
    getUnifiedComments(pageSlug),
    getCollectionComments(getLegacyCollectionName(pageSlug), pageSlug),
  ]);

  return sortComments(dedupeComments([...unifiedComments, ...legacyComments]));
}

export async function deleteComment(
  commentId: string,
  collectionName = COLLECTION_NAME
): Promise<void> {
  if (!USE_FIREBASE) {
    for (const [pageSlug, comments] of mockComments.entries()) {
      mockComments.set(
        pageSlug,
        comments.filter((comment) => comment.id !== commentId)
      );
    }
    return;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  await firestore.modules.deleteDoc(
    firestore.modules.doc(firestore.db, collectionName, commentId)
  );
}

export async function getAllComments(): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    return sortComments([...mockComments.values()].flat());
  }

  const legacySlugs = [...new Set(getAllWeddingPageSlugs())];
  const [unifiedComments, legacyCommentsByCollection] = await Promise.all([
    getUnifiedComments(),
    Promise.all(
      legacySlugs.map((pageSlug) =>
        getCollectionComments(getLegacyCollectionName(pageSlug), pageSlug)
      )
    ),
  ]);

  return sortComments(
    dedupeComments([...unifiedComments, ...legacyCommentsByCollection.flat()])
  );
}
