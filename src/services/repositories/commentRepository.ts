import { buildGuestbookCommentStatusPatch } from '@/lib/guestbookComments';

import { ensureClientFirestoreState } from './clientFirestoreRepositoryCore';
import {
  buildClientEventCommentCollectionPath,
  resolveClientStoredEventBySlug,
} from './clientEventRepositoryCore';
import {
  buildEventCommentCollectionPath,
  normalizeRepositoryComment,
  type RepositoryComment as Comment,
} from './mappers/commentRepositoryMapper';
import { requireTrimmedString } from './repositoryValidators';

const COMMENTS_COLLECTION = 'comments';
const EVENT_COLLECTION_PREFIX = 'events/';

export interface CommentInput {
  author: string;
  message: string;
  pageSlug: string;
}

export type { Comment };

export interface CommentRepository {
  isAvailable(): boolean;
  create(input: CommentInput): Promise<void>;
  list(pageSlug?: string): Promise<Comment[]>;
  scheduleDelete(commentId: string, collectionName: string): Promise<void>;
}

function isEventCommentCollectionPath(collectionName: string) {
  return collectionName.startsWith(EVENT_COLLECTION_PREFIX);
}

async function listEventCommentsByPageSlug(pageSlug: string) {
  const resolvedEvent = await resolveClientStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return [];
  }

  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return [];
  }

  const collectionPath = buildEventCommentCollectionPath(resolvedEvent.summary.eventId);
  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collection(firestore.db, collectionPath)
  );

  return snapshot.docs
    .map((docSnapshot: { id: string; data: () => Record<string, unknown> }) =>
      normalizeRepositoryComment(docSnapshot.id, docSnapshot.data(), {
        pageSlug: resolvedEvent.summary.slug,
        collectionName: collectionPath,
      })
    )
    .filter((comment: Comment | null): comment is Comment => comment !== null);
}

async function listAllEventComments() {
  const firestore = await ensureClientFirestoreState();
  if (!firestore) {
    return [];
  }

  const snapshot = await firestore.modules.getDocs(
    firestore.modules.collectionGroup(firestore.db, COMMENTS_COLLECTION)
  );

  return snapshot.docs
    .filter((docSnapshot: { ref: { parent: { path: string } } }) =>
      isEventCommentCollectionPath(docSnapshot.ref.parent.path)
    )
    .map((docSnapshot: {
      id: string;
      data: () => Record<string, unknown>;
      ref: { parent: { path: string } };
    }) =>
      normalizeRepositoryComment(docSnapshot.id, docSnapshot.data(), {
        collectionName: docSnapshot.ref.parent.path,
      })
    )
    .filter((comment: Comment | null): comment is Comment => comment !== null);
}

export const commentRepository: CommentRepository = {
  isAvailable() {
    return process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';
  },

  async create(input) {
    const pageSlug = requireTrimmedString(input.pageSlug, {
      fieldLabel: 'Page slug',
      message: 'Required comment fields are missing.',
    });
    const author = requireTrimmedString(input.author, {
      fieldLabel: 'Author',
      message: 'Required comment fields are missing.',
    });
    const message = requireTrimmedString(input.message, {
      fieldLabel: 'Message',
      message: 'Required comment fields are missing.',
    });
    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      throw new Error('Firestore is not initialized.');
    }

    const resolvedEvent = await resolveClientStoredEventBySlug(pageSlug);
    if (!resolvedEvent) {
      throw new Error('Invitation event could not be resolved.');
    }

    await firestore.modules.addDoc(
      firestore.modules.collection(
        firestore.db,
        buildClientEventCommentCollectionPath(resolvedEvent.summary.eventId)
      ),
      {
        author,
        message,
        pageSlug: resolvedEvent.summary.slug,
        createdAt: firestore.modules.serverTimestamp(),
      }
    );
  },

  async list(pageSlug) {
    const normalizedPageSlug = pageSlug?.trim() ? pageSlug.trim() : undefined;
    if (!normalizedPageSlug) {
      return listAllEventComments();
    }

    return listEventCommentsByPageSlug(normalizedPageSlug);
  },

  async scheduleDelete(commentId, collectionName) {
    const normalizedCommentId = requireTrimmedString(commentId, {
      fieldLabel: 'Comment id',
      message: 'Comment collection path is required.',
    });
    const normalizedCollectionName = requireTrimmedString(collectionName, {
      fieldLabel: 'Comment collection path',
      message: 'Comment collection path is required.',
    });
    if (!isEventCommentCollectionPath(normalizedCollectionName)) {
      throw new Error('Event comment collection path is required.');
    }

    const firestore = await ensureClientFirestoreState();
    if (!firestore) {
      throw new Error('Firestore is not initialized.');
    }

    await firestore.modules.updateDoc(
      firestore.modules.doc(
        firestore.db,
        normalizedCollectionName,
        normalizedCommentId
      ),
      buildGuestbookCommentStatusPatch('scheduleDelete', new Date())
    );
  },
};
