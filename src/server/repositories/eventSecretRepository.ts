import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';

import { getServerFirestore } from '../firebaseAdmin';
import { buildEventSecretRecordFromEventDoc } from './eventReadThroughDtos';
import { ensureEventMirrorBySlug, resolveStoredEventBySlug } from './eventRepository';
import { loadReadThroughValue } from './readThrough';
import { executeWriteThrough } from './writeThrough';

const LEGACY_EVENT_SECRET_COLLECTION = 'client-passwords';
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

  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function normalizeLegacySecretRecord(
  pageSlug: string,
  data: Record<string, unknown>
): EventSecretRecord | null {
  const normalizedPageSlug =
    typeof data.pageSlug === 'string' && data.pageSlug.trim() ? data.pageSlug.trim() : pageSlug;
  const passwordHash =
    typeof data.passwordHash === 'string' && data.passwordHash.trim()
      ? data.passwordHash.trim()
      : null;
  const passwordSalt =
    typeof data.passwordSalt === 'string' && data.passwordSalt.trim()
      ? data.passwordSalt.trim()
      : null;
  const passwordIterations =
    typeof data.passwordIterations === 'number' && Number.isFinite(data.passwordIterations)
      ? data.passwordIterations
      : null;
  const legacyPassword =
    typeof data.password === 'string' && data.password.trim() ? data.password.trim() : null;
  const passwordVersion =
    typeof data.passwordVersion === 'number' && Number.isFinite(data.passwordVersion)
      ? data.passwordVersion
      : 1;

  if (
    !normalizedPageSlug ||
    (!legacyPassword && !(passwordHash && passwordSalt && passwordIterations))
  ) {
    return null;
  }

  return {
    pageSlug: normalizedPageSlug,
    passwordHash,
    passwordSalt,
    passwordIterations,
    passwordVersion,
    legacyPassword,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

async function fetchLegacySecretBySlug(pageSlug: string) {
  const db = getServerFirestore();
  if (!db) {
    return null;
  }

  const directSnapshot = await db
    .collection(LEGACY_EVENT_SECRET_COLLECTION)
    .doc(pageSlug)
    .get();
  if (directSnapshot.exists) {
    const normalized = normalizeLegacySecretRecord(pageSlug, directSnapshot.data() ?? {});
    if (normalized) {
      return normalized;
    }
  }

  const snapshot = await db
    .collection(LEGACY_EVENT_SECRET_COLLECTION)
    .where('pageSlug', '==', pageSlug)
    .limit(1)
    .get();
  const matchedDoc = snapshot.docs[0] ?? null;
  return matchedDoc ? normalizeLegacySecretRecord(matchedDoc.id, matchedDoc.data() ?? {}) : null;
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

    return loadReadThroughValue({
      preferred: () => fetchEventSecretBySlug(normalizedPageSlug),
      fallback: () => fetchLegacySecretBySlug(normalizedPageSlug),
    });
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

    await executeWriteThrough({
      operation: 'saveEventSecret',
      pageSlug: normalizedPageSlug,
      legacyCollection: LEGACY_EVENT_SECRET_COLLECTION,
      eventCollection: EVENT_SECRET_COLLECTION,
      payload: {
        passwordVersion: input.passwordVersion,
      },
      legacyWrite: async () => {
        await db
          .collection(LEGACY_EVENT_SECRET_COLLECTION)
          .doc(normalizedPageSlug)
          .set(
            {
              pageSlug: normalizedPageSlug,
              passwordHash: input.passwordHash,
              passwordSalt: input.passwordSalt,
              passwordIterations: input.passwordIterations,
              passwordVersion: input.passwordVersion,
              createdAt: input.createdAt,
              updatedAt: input.updatedAt,
              password: FieldValue.delete(),
              editorTokenHash: FieldValue.delete(),
            },
            { merge: true }
          );

        return undefined;
      },
      eventWrite: async () => {
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
              passwordHash: input.passwordHash,
              passwordSalt: input.passwordSalt,
              passwordIterations: input.passwordIterations,
              passwordVersion: input.passwordVersion,
              createdAt: input.createdAt,
              updatedAt: input.updatedAt,
              password: FieldValue.delete(),
            },
            { merge: true }
          );

        return undefined;
      },
    });
  },
};
