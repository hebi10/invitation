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

export interface CommentSummary {
  totalCount: number;
  recentCount: number;
}

const GUESTBOOKS_COLLECTION = 'guestbooks';
const GUESTBOOK_COMMENTS_COLLECTION = 'comments';
const LEGACY_UNIFIED_COLLECTION = 'comments';
const DEFAULT_RECENT_COMMENT_DAYS = 7;

const mockComments = new Map<string, Comment[]>();

type FirestoreModules = {
  addDoc: any;
  collection: any;
  collectionGroup: any;
  deleteDoc: any;
  doc: any;
  getDocs: any;
  query: any;
  serverTimestamp: any;
  updateDoc: any;
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
      collectionGroup: firestore.collectionGroup,
      deleteDoc: firestore.deleteDoc,
      doc: firestore.doc,
      getDocs: firestore.getDocs,
      query: firestore.query,
      serverTimestamp: firestore.serverTimestamp,
      updateDoc: firestore.updateDoc,
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

function isPermissionDeniedError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return String((error as { code?: unknown }).code ?? '') === 'permission-denied';
}

function getGuestbookCollectionPath(pageSlug: string) {
  return `${GUESTBOOKS_COLLECTION}/${pageSlug}/${GUESTBOOK_COMMENTS_COLLECTION}`;
}

function getLegacyCollectionName(pageSlug: string) {
  return `comments-${pageSlug}`;
}

function normalizeComment(
  id: string,
  data: Record<string, any>,
  options: { pageSlug?: string; collectionName?: string } = {}
): Comment | null {
  if (data.deleted === true) {
    return null;
  }

  const pageSlug = data.pageSlug ?? options.pageSlug ?? '';
  if (typeof pageSlug !== 'string' || !pageSlug.trim()) {
    return null;
  }

  const normalizedPageSlug = pageSlug.trim();

  return {
    id,
    author: data.author ?? '',
    message: data.message ?? '',
    pageSlug: normalizedPageSlug,
    createdAt: toDate(data.createdAt),
    collectionName:
      options.collectionName ?? getGuestbookCollectionPath(normalizedPageSlug),
  };
}

function sortComments(comments: Comment[]) {
  return [...comments].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}

function mergeComments(...groups: Comment[][]) {
  const merged = new Map<string, Comment>();

  groups.forEach((group) => {
    group.forEach((comment) => {
      const key = `${comment.pageSlug}:${comment.id}`;
      if (!merged.has(key)) {
        merged.set(key, comment);
      }
    });
  });

  return [...merged.values()];
}

function buildRecentThreshold(recentDays: number) {
  return new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
}

async function getGuestbookComments(pageSlug?: string): Promise<Comment[]> {
  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  try {
    const snapshot = pageSlug
      ? await firestore.modules.getDocs(
          firestore.modules.collection(
            firestore.db,
            getGuestbookCollectionPath(pageSlug)
          )
        )
      : await firestore.modules.getDocs(
          firestore.modules.collectionGroup(
            firestore.db,
            GUESTBOOK_COMMENTS_COLLECTION
          )
        );

    return snapshot.docs
      .map((docSnapshot: { id: string; data: () => Record<string, any> }) => {
        const data = docSnapshot.data();
        const resolvedPageSlug =
          pageSlug ??
          (typeof data.pageSlug === 'string' ? data.pageSlug.trim() : '');

        return normalizeComment(docSnapshot.id, data, {
          pageSlug: resolvedPageSlug,
          collectionName: resolvedPageSlug
            ? getGuestbookCollectionPath(resolvedPageSlug)
            : undefined,
        });
      })
      .filter((comment: Comment | null): comment is Comment => comment !== null);
  } catch (error) {
    console.error('[commentService] failed to load guestbook comments', error);
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
      LEGACY_UNIFIED_COLLECTION
    );
    const snapshot = pageSlug
      ? await firestore.modules.getDocs(
          firestore.modules.query(
            collectionRef,
            firestore.modules.where('pageSlug', '==', pageSlug)
          )
        )
      : await firestore.modules.getDocs(collectionRef);

    return snapshot.docs
      .map((docSnapshot: { id: string; data: () => Record<string, any> }) =>
        normalizeComment(docSnapshot.id, docSnapshot.data(), {
          pageSlug,
          collectionName: LEGACY_UNIFIED_COLLECTION,
        })
      )
      .filter((comment: Comment | null): comment is Comment => comment !== null);
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error('[commentService] failed to load unified comments', error);
    }
    return [];
  }
}

async function getLegacyComments(pageSlug?: string): Promise<Comment[]> {
  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  const targetSlugs = pageSlug ? [pageSlug] : getAllWeddingPageSlugs();

  const commentGroups = await Promise.all(
    targetSlugs.map(async (slug) => {
      const collectionName = getLegacyCollectionName(slug);

      try {
        const snapshot = await firestore.modules.getDocs(
          firestore.modules.collection(firestore.db, collectionName)
        );

        return snapshot.docs
          .map((docSnapshot: { id: string; data: () => Record<string, any> }) =>
            normalizeComment(docSnapshot.id, docSnapshot.data(), {
              pageSlug: slug,
              collectionName,
            })
          )
          .filter((comment: Comment | null): comment is Comment => comment !== null);
      } catch (error) {
        if (!isPermissionDeniedError(error)) {
          console.error(
            `[commentService] failed to load legacy comments from ${collectionName}`,
            error
          );
        }
        return [];
      }
    })
  );

  return commentGroups.flat();
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
      collectionName: getGuestbookCollectionPath(payload.pageSlug),
    };
    const existing = mockComments.get(payload.pageSlug) ?? [];
    mockComments.set(payload.pageSlug, [nextComment, ...existing]);
    return;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  await firestore.modules.addDoc(
    firestore.modules.collection(
      firestore.db,
      getGuestbookCollectionPath(payload.pageSlug)
    ),
    {
      ...payload,
      createdAt: firestore.modules.serverTimestamp(),
    }
  );
}

export async function getComments(pageSlug: string): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    return sortComments([...(mockComments.get(pageSlug) ?? [])]);
  }

  const [guestbookComments, unifiedComments, legacyComments] = await Promise.all([
    getGuestbookComments(pageSlug),
    getUnifiedComments(pageSlug),
    getLegacyComments(pageSlug),
  ]);

  return sortComments(
    mergeComments(guestbookComments, unifiedComments, legacyComments)
  );
}

export async function softDeleteCommentByClient(
  commentId: string,
  pageSlug: string,
  editorTokenHash: string,
  collectionName = getGuestbookCollectionPath(pageSlug)
): Promise<void> {
  if (!USE_FIREBASE) {
    const comments = mockComments.get(pageSlug) ?? [];
    mockComments.set(
      pageSlug,
      comments.filter((comment) => comment.id !== commentId)
    );
    return;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore is not initialized.');
  }

  await firestore.modules.updateDoc(
    firestore.modules.doc(firestore.db, collectionName, commentId),
    {
      deleted: true,
      deletedAt: firestore.modules.serverTimestamp(),
      deletedBy: 'client',
      editorTokenHash,
    }
  );
}

export async function deleteComment(
  commentId: string,
  collectionName = LEGACY_UNIFIED_COLLECTION
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

  const [guestbookComments, unifiedComments, legacyComments] = await Promise.all([
    getGuestbookComments(),
    getUnifiedComments(),
    getLegacyComments(),
  ]);

  return sortComments(
    mergeComments(guestbookComments, unifiedComments, legacyComments)
  );
}

export async function getCommentSummary(
  recentDays = DEFAULT_RECENT_COMMENT_DAYS
): Promise<CommentSummary> {
  const threshold = buildRecentThreshold(recentDays);
  const comments = await getAllComments();

  return {
    totalCount: comments.length,
    recentCount: comments.filter(
      (comment) => comment.createdAt.getTime() >= threshold.getTime()
    ).length,
  };
}
