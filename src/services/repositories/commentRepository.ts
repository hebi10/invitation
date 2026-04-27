import { buildGuestbookCommentStatusPatch } from '@/lib/guestbookComments';
import type { DocumentData, UpdateData } from 'firebase/firestore';

import { ensureClientFirestoreState } from './clientFirestoreRepositoryCore';
import {
  listClientEventSummaries,
  resolveClientStoredEventBySlug,
} from './clientEventRepositoryCore';
import type { ClientEventSummaryRecord } from './mappers/clientEventRepositoryMapper';
import {
  buildEventCommentCollectionPath,
  normalizeRepositoryComment,
  type RepositoryComment as Comment,
} from './mappers/commentRepositoryMapper';
import { requireTrimmedString } from './repositoryValidators';

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

async function readCommentApiResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '방명록 등록에 실패했습니다.'
    );
  }
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

  const eventSummaries = await listClientEventSummaries();
  const commentGroups = await Promise.all(
    eventSummaries.map(async (eventSummary: ClientEventSummaryRecord) => {
      const collectionPath = buildEventCommentCollectionPath(eventSummary.eventId);

      try {
        const snapshot = await firestore.modules.getDocs(
          firestore.modules.collection(firestore.db, collectionPath)
        );

        return snapshot.docs
          .map((docSnapshot: { id: string; data: () => Record<string, unknown> }) =>
            normalizeRepositoryComment(docSnapshot.id, docSnapshot.data(), {
              pageSlug: eventSummary.slug,
              collectionName: collectionPath,
            })
          )
          .filter((comment: Comment | null): comment is Comment => comment !== null);
      } catch (error) {
        console.error(
          `[commentRepository] event comments load failed for ${eventSummary.slug}`,
          error
        );
        return [];
      }
    })
  );

  return commentGroups.flat();
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
    await readCommentApiResponse(
      await fetch('/api/guestbook/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          author,
          message,
          pageSlug,
        }),
      })
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

    const statusPatch = buildGuestbookCommentStatusPatch(
      'scheduleDelete',
      new Date()
    ) as unknown as UpdateData<DocumentData>;

    await firestore.modules.updateDoc(
      firestore.modules.doc(
        firestore.db,
        normalizedCollectionName,
        normalizedCommentId
      ),
      statusPatch
    );
  },
};
