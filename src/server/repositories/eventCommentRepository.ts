import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import { buildEventCommentRecordFromEventDoc } from './eventReadThroughDtos';
import {
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';

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

async function fetchEventCommentsByPageSlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return [] as StoredEventCommentRecord[];
  }

  const db = getServerFirestore();
  if (!db) {
    return [] as StoredEventCommentRecord[];
  }

  const snapshot = await db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(COMMENTS_COLLECTION)
    .get();

  return snapshot.docs.map((docSnapshot) =>
    buildEventCommentRecordFromEventDoc(
      resolvedEvent.summary,
      docSnapshot.id,
      docSnapshot.data() ?? {}
    )
  );
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
    return null;
  }

  return buildEventCommentRecordFromEventDoc(
    resolvedEvent.summary,
    snapshot.id,
    snapshot.data() ?? {}
  );
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

    return fetchEventCommentsByPageSlug(normalizedPageSlug);
  },

  async findByPageSlugAndId(pageSlug, commentId) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedPageSlug || !normalizedCommentId) {
      return null;
    }

    return fetchEventCommentById(normalizedPageSlug, normalizedCommentId);
  },

  async updateByPageSlugAndId(pageSlug, commentId, patch) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedPageSlug || !normalizedCommentId) {
      throw new Error('Comment target was not specified.');
    }

    const updatedEventComment = await updateEventCommentOnly(
      normalizedPageSlug,
      normalizedCommentId,
      patch
    );
    if (!updatedEventComment) {
      throw new Error('Comment target was not specified.');
    }
  },

  async deleteByPageSlugAndId(pageSlug, commentId) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    const normalizedCommentId = commentId.trim();
    if (!normalizedPageSlug || !normalizedCommentId) {
      throw new Error('Comment target was not specified.');
    }

    const deletedEventComment = await deleteEventCommentOnly(
      normalizedPageSlug,
      normalizedCommentId
    );
    if (!deletedEventComment) {
      throw new Error('Comment target was not specified.');
    }
  },
};
