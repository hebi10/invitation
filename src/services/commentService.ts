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

const COLLECTION_NAME = 'comments';
const DEFAULT_RECENT_COMMENT_DAYS = 7;

const mockComments = new Map<string, Comment[]>();

type FirestoreModules = {
  addDoc: any;
  collection: any;
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

function normalizeComment(
  id: string,
  data: Record<string, any>,
  options: { pageSlug?: string; collectionName?: string } = {}
): Comment | null {
  if (data.deleted === true) {
    return null;
  }

  return {
    id,
    author: data.author ?? '',
    message: data.message ?? '',
    pageSlug: data.pageSlug ?? options.pageSlug ?? '',
    createdAt: toDate(data.createdAt),
    collectionName: options.collectionName ?? COLLECTION_NAME,
  };
}

function sortComments(comments: Comment[]) {
  return [...comments].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}

function buildRecentThreshold(recentDays: number) {
  return new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
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

    return snapshot.docs
      .map((docSnapshot: { id: string; data: () => Record<string, any> }) =>
        normalizeComment(docSnapshot.id, docSnapshot.data(), {
          pageSlug,
          collectionName: COLLECTION_NAME,
        })
      )
      .filter((comment: Comment | null): comment is Comment => comment !== null);
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

  await firestore.modules.addDoc(
    firestore.modules.collection(firestore.db, COLLECTION_NAME),
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

  return sortComments(await getUnifiedComments(pageSlug));
}

export async function softDeleteCommentByClient(
  commentId: string,
  pageSlug: string,
  editorTokenHash: string
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
    firestore.modules.doc(firestore.db, COLLECTION_NAME, commentId),
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

  return sortComments(await getUnifiedComments());
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
