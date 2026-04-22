import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import { buildEventCommentRecordFromEventDoc } from './eventReadThroughDtos';
import {
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';
import { isLegacyReadFallbackEnabled } from './eventRolloutConfig';
import { executeWriteThrough } from './writeThrough';

const GUESTBOOKS_COLLECTION = 'guestbooks';
const COMMENTS_COLLECTION = 'comments';

export interface StoredEventCommentRecord {
  id: string;
  pageSlug: string;
  eventId?: string | null;
  data: Record<string, unknown>;
}

export interface EventCommentRepository {
  isAvailable(): boolean;
  listByPageSlug(pageSlug: string): Promise<StoredEventCommentRecord[]>;
  findByPageSlugAndId(
    pageSlug: string,
    commentId: string
  ): Promise<StoredEventCommentRecord | null>;
  updateByPageSlugAndId(
    pageSlug: string,
    commentId: string,
    patch: Record<string, unknown>
  ): Promise<void>;
  deleteByPageSlugAndId(pageSlug: string, commentId: string): Promise<void>;
}

function normalizePageSlug(pageSlug: string) {
  return pageSlug.trim();
}

async function fetchLegacyCommentsByPageSlug(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return [];
  }

  const snapshot = await db
    .collection(GUESTBOOKS_COLLECTION)
    .doc(pageSlug)
    .collection(COMMENTS_COLLECTION)
    .get();

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    pageSlug,
    data: docSnapshot.data() ?? {},
  }));
}

async function fetchLegacyCommentById(pageSlug: string, commentId: string) {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(GUESTBOOKS_COLLECTION)
    .doc(pageSlug)
    .collection(COMMENTS_COLLECTION)
    .doc(commentId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    pageSlug,
    data: snapshot.data() ?? {},
  } satisfies StoredEventCommentRecord;
}

async function fetchEventCommentsByPageSlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(COMMENTS_COLLECTION)
    .get();

  return {
    authoritative: snapshot.size > 0 || resolvedEvent.summary.commentCount !== null,
    records: snapshot.docs.map((docSnapshot) =>
      buildEventCommentRecordFromEventDoc(
        resolvedEvent.summary,
        docSnapshot.id,
        docSnapshot.data() ?? {}
      )
    ),
  };
}

async function fetchEventCommentById(pageSlug: string, commentId: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const snapshot = await db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(COMMENTS_COLLECTION)
    .doc(commentId)
    .get();

  if (!snapshot.exists) {
    return {
      authoritative: resolvedEvent.summary.commentCount !== null,
      record: null,
    };
  }

  return {
    authoritative: true,
    record: buildEventCommentRecordFromEventDoc(
      resolvedEvent.summary,
      snapshot.id,
      snapshot.data() ?? {}
    ),
  };
}

async function updateEventCommentOnly(
  pageSlug: string,
  commentId: string,
  patch: Record<string, unknown>
) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return false;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const docRef = db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(COMMENTS_COLLECTION)
    .doc(commentId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return false;
  }

  await docRef.update(patch);
  return true;
}

async function upsertEventCommentPatch(
  pageSlug: string,
  commentId: string,
  patch: Record<string, unknown>
) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return false;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const docRef = db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(COMMENTS_COLLECTION)
    .doc(commentId);
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    await docRef.update(patch);
    return true;
  }

  const legacyComment = await fetchLegacyCommentById(pageSlug, commentId);
  if (!legacyComment) {
    return false;
  }

  const normalizedComment = buildEventCommentRecordFromEventDoc(
    resolvedEvent.summary,
    legacyComment.id,
    {
      ...legacyComment.data,
      ...patch,
    }
  );

  await docRef.set(
    {
      eventId: resolvedEvent.summary.eventId,
      slug: normalizedComment.pageSlug,
      pageSlug: normalizedComment.pageSlug,
      ...normalizedComment.data,
    },
    { merge: true }
  );

  return true;
}

async function deleteEventCommentOnly(pageSlug: string, commentId: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return false;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const docRef = db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(COMMENTS_COLLECTION)
    .doc(commentId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

export const firestoreEventCommentRepository: EventCommentRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async listByPageSlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return [];
    }

    const preferred = await fetchEventCommentsByPageSlug(normalizedPageSlug);
    if (preferred && preferred.authoritative) {
      return preferred.records;
    }

    if (!isLegacyReadFallbackEnabled()) {
      return preferred?.records ?? [];
    }

    return fetchLegacyCommentsByPageSlug(normalizedPageSlug);
  },

  async findByPageSlugAndId(pageSlug, commentId) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedPageSlug || !normalizedCommentId) {
      return null;
    }

    const preferred = await fetchEventCommentById(normalizedPageSlug, normalizedCommentId);
    if (preferred) {
      if (preferred.record) {
        return preferred.record;
      }

      if (preferred.authoritative) {
        return null;
      }
    }

    if (!isLegacyReadFallbackEnabled()) {
      return preferred?.record ?? null;
    }

    return fetchLegacyCommentById(normalizedPageSlug, normalizedCommentId);
  },

  async updateByPageSlugAndId(pageSlug, commentId, patch) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedPageSlug || !normalizedCommentId) {
      throw new Error('Comment target was not specified.');
    }

    const legacyComment = await fetchLegacyCommentById(normalizedPageSlug, normalizedCommentId);
    if (!legacyComment) {
      const updatedEventComment = await updateEventCommentOnly(
        normalizedPageSlug,
        normalizedCommentId,
        patch
      );
      if (updatedEventComment) {
        return;
      }

      throw new Error('Comment target was not specified.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    await executeWriteThrough({
      operation: 'updateEventComment',
      pageSlug: normalizedPageSlug,
      legacyCollection: `${GUESTBOOKS_COLLECTION}/${normalizedPageSlug}/${COMMENTS_COLLECTION}`,
      eventCollection: `${EVENTS_COLLECTION}/{eventId}/${COMMENTS_COLLECTION}`,
      payload: {
        commentId: normalizedCommentId,
        patch,
      },
      legacyWrite: async () => {
        await db
          .collection(GUESTBOOKS_COLLECTION)
          .doc(normalizedPageSlug)
          .collection(COMMENTS_COLLECTION)
          .doc(normalizedCommentId)
          .update(patch);

        return undefined;
      },
      eventWrite: async () => {
        const updatedEventComment = await upsertEventCommentPatch(
          normalizedPageSlug,
          normalizedCommentId,
          patch
        );
        if (!updatedEventComment) {
          throw new Error('Comment target was not specified.');
        }

        return undefined;
      },
    });
  },

  async deleteByPageSlugAndId(pageSlug, commentId) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedPageSlug || !normalizedCommentId) {
      throw new Error('Comment target was not specified.');
    }

    const legacyComment = await fetchLegacyCommentById(normalizedPageSlug, normalizedCommentId);
    if (!legacyComment) {
      const deletedEventComment = await deleteEventCommentOnly(
        normalizedPageSlug,
        normalizedCommentId
      );
      if (deletedEventComment) {
        return;
      }

      throw new Error('Comment target was not specified.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    await executeWriteThrough({
      operation: 'deleteEventComment',
      pageSlug: normalizedPageSlug,
      legacyCollection: `${GUESTBOOKS_COLLECTION}/${normalizedPageSlug}/${COMMENTS_COLLECTION}`,
      eventCollection: `${EVENTS_COLLECTION}/{eventId}/${COMMENTS_COLLECTION}`,
      payload: {
        commentId: normalizedCommentId,
      },
      legacyWrite: async () => {
        await db
          .collection(GUESTBOOKS_COLLECTION)
          .doc(normalizedPageSlug)
          .collection(COMMENTS_COLLECTION)
          .doc(normalizedCommentId)
          .delete();

        return undefined;
      },
      eventWrite: async () => {
        const deletedEventComment = await deleteEventCommentOnly(
          normalizedPageSlug,
          normalizedCommentId
        );
        if (!deletedEventComment) {
          throw new Error('Comment target was not specified.');
        }

        return undefined;
      },
    });
  },
};
