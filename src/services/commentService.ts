import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';

export interface Comment {
  id: string;
  author: string;
  message: string;
  createdAt: Date;
  pageSlug: string;
}

export interface CommentInput {
  author: string;
  message: string;
  pageSlug: string;
}

const COLLECTION_NAME = 'comments';

const mockComments = new Map<string, Comment[]>();

type FirestoreModules = {
  addDoc: any;
  collection: any;
  deleteDoc: any;
  doc: any;
  getDocs: any;
  orderBy: any;
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
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  if (!firestoreModules) {
    const firestore = await import('firebase/firestore');
    firestoreModules = {
      addDoc: firestore.addDoc,
      collection: firestore.collection,
      deleteDoc: firestore.deleteDoc,
      doc: firestore.doc,
      getDocs: firestore.getDocs,
      orderBy: firestore.orderBy,
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

  return new Date();
}

function normalizeComment(id: string, data: Record<string, any>): Comment {
  return {
    id,
    author: data.author ?? '',
    message: data.message ?? '',
    pageSlug: data.pageSlug ?? '',
    createdAt: toDate(data.createdAt),
  };
}

export async function addComment(commentData: CommentInput): Promise<void> {
  const payload = {
    author: commentData.author.trim(),
    message: commentData.message.trim(),
    pageSlug: commentData.pageSlug,
  };

  if (!payload.author || !payload.message || !payload.pageSlug) {
    throw new Error('댓글 필수값이 비어 있습니다.');
  }

  if (!USE_FIREBASE) {
    const nextComment: Comment = {
      id: `mock-${Date.now()}`,
      ...payload,
      createdAt: new Date(),
    };
    const existing = mockComments.get(payload.pageSlug) ?? [];
    mockComments.set(payload.pageSlug, [nextComment, ...existing]);
    return;
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
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
    return [...(mockComments.get(pageSlug) ?? [])].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
    );
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  try {
    const snapshot = await firestore.modules.getDocs(
      firestore.modules.query(
        firestore.modules.collection(firestore.db, COLLECTION_NAME),
        firestore.modules.where('pageSlug', '==', pageSlug),
        firestore.modules.orderBy('createdAt', 'desc')
      )
    );

    return snapshot.docs.map((docSnapshot: { id: string; data: () => Record<string, any> }) =>
      normalizeComment(docSnapshot.id, docSnapshot.data())
    );
  } catch (error) {
    console.error('[commentService] failed to load comments', error);
    return [];
  }
}

export async function deleteComment(commentId: string): Promise<void> {
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
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  await firestore.modules.deleteDoc(
    firestore.modules.doc(firestore.db, COLLECTION_NAME, commentId)
  );
}

export async function getAllComments(): Promise<Comment[]> {
  if (!USE_FIREBASE) {
    return [...mockComments.values()]
      .flat()
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  const firestore = await ensureFirestoreModules();
  if (!firestore) {
    return [];
  }

  try {
    const snapshot = await firestore.modules.getDocs(
      firestore.modules.query(
        firestore.modules.collection(firestore.db, COLLECTION_NAME),
        firestore.modules.orderBy('createdAt', 'desc')
      )
    );

    return snapshot.docs.map((docSnapshot: { id: string; data: () => Record<string, any> }) =>
      normalizeComment(docSnapshot.id, docSnapshot.data())
    );
  } catch (error) {
    console.error('[commentService] failed to load all comments', error);
    return [];
  }
}
