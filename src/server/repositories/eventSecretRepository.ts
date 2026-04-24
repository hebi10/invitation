import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { getServerFirestore } from '../firebaseAdmin';
import { buildEventSecretRecordFromEventDoc } from './eventReadThroughDtos';
import {
  ensureEventMirrorBySlug,
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';
const EVENT_SECRET_COLLECTION = 'eventSecrets';

export interface EventSecretRecord {
  pageSlug: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordIterations: number | null;
  passwordVersion: number;
  legacyPassword: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface EventSecretRepository {
  isAvailable(): boolean;
  findByPageSlug(pageSlug: string): Promise<EventSecretRecord | null>;
  saveByPageSlug(input: {
    pageSlug: string;
    passwordHash: string;
    passwordSalt: string;
    passwordIterations: number;
    passwordVersion: number;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<void>;
}

async function fetchEventSecretBySlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const directSnapshot = await db
    .collection(EVENT_SECRET_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .get();
  if (directSnapshot.exists) {
    const normalized = buildEventSecretRecordFromEventDoc(
      resolvedEvent.summary,
      directSnapshot.data() ?? {}
    );
    if (normalized) {
      return normalized;
    }
  }

  const snapshot = await db
    .collection(EVENT_SECRET_COLLECTION)
    .where('slug', '==', resolvedEvent.summary.slug)
    .limit(1)
    .get();
  const matchedDoc = snapshot.docs[0] ?? null;
  return matchedDoc
    ? buildEventSecretRecordFromEventDoc(resolvedEvent.summary, matchedDoc.data() ?? {})
    : null;
}

export const firestoreEventSecretRepository: EventSecretRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async findByPageSlug(pageSlug) {
    const normalizedPageSlug = pageSlug.trim();
    if (!normalizedPageSlug) {
      return null;
    }

    return fetchEventSecretBySlug(normalizedPageSlug);
  },

  async saveByPageSlug(input) {
    const normalizedPageSlug = input.pageSlug.trim();
    if (!normalizedPageSlug) {
      throw new Error('Page slug and password are required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const mirroredEvent = await ensureEventMirrorBySlug(normalizedPageSlug, {
      forceCreate: true,
      now: input.updatedAt,
    });
    if (!mirroredEvent) {
      throw new Error('Failed to ensure event mirror for password save.');
    }

    await db
      .collection(EVENT_SECRET_COLLECTION)
      .doc(mirroredEvent.summary.eventId)
      .set(
        {
          eventId: mirroredEvent.summary.eventId,
          slug: mirroredEvent.summary.slug,
          password: FieldValue.delete(),
          passwordHash: input.passwordHash,
          passwordSalt: input.passwordSalt,
          passwordIterations: input.passwordIterations,
          passwordVersion: input.passwordVersion,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        },
        { merge: true }
      );

    await db
      .collection(EVENTS_COLLECTION)
      .doc(mirroredEvent.summary.eventId)
      .set(
        {
          security: {
            hasPassword: true,
            passwordVersion: input.passwordVersion,
            requiresReset: false,
            passwordUpdatedAt: input.updatedAt,
          },
        },
        { merge: true }
      );
  },
};
