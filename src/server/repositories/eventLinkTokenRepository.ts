import 'server-only';

import { FieldPath } from 'firebase-admin/firestore';

import { getServerFirestore } from '../firebaseAdmin';
import {
  buildEventLinkTokenRecordFromEventDoc,
  type EventLinkTokenRecordDto as StoredMobileClientEditorLinkTokenRecord,
  type MobileClientEditorLinkTokenPurpose,
} from './eventReadThroughDtos';
import {
  EVENTS_COLLECTION,
  ensureEventMirrorBySlug,
  findStoredEventSummaryById,
  resolveStoredEventBySlug,
} from './eventRepository';
import { getEventRolloutWriteMode } from './eventRolloutConfig';
import { loadReadThroughValue } from './readThrough';
import { executeWriteThrough } from './writeThrough';

const LEGACY_LINK_TOKEN_COLLECTION = 'mobile-client-editor-link-tokens';
const EVENT_LINK_TOKEN_COLLECTION = 'linkTokens';

export type { MobileClientEditorLinkTokenPurpose };
export type { StoredMobileClientEditorLinkTokenRecord };

export type ConsumeMobileClientEditorLinkTokenResult =
  | {
      status: 'ok';
      record: StoredMobileClientEditorLinkTokenRecord;
    }
  | {
      status: 'invalid' | 'used' | 'expired' | 'revoked';
      record: StoredMobileClientEditorLinkTokenRecord | null;
    };

export interface EventLinkTokenRepository {
  isAvailable(): boolean;
  findByTokenHash(
    tokenHash: string
  ): Promise<StoredMobileClientEditorLinkTokenRecord | null>;
  create(input: {
    pageSlug: string;
    tokenHash: string;
    purpose: MobileClientEditorLinkTokenPurpose;
    passwordVersion: number;
    createdAt: Date;
    expiresAt: Date;
    issuedBy?: string | null;
    issuedByType?: string | null;
  }): Promise<StoredMobileClientEditorLinkTokenRecord>;
  revokeActiveByPageSlug(
    pageSlug: string,
    purpose: MobileClientEditorLinkTokenPurpose,
    now?: Date
  ): Promise<number>;
  revokeById(
    tokenId: string,
    now?: Date
  ): Promise<StoredMobileClientEditorLinkTokenRecord | null>;
  consumeById(
    tokenId: string,
    expectedPasswordVersion: number,
    now?: Date
  ): Promise<ConsumeMobileClientEditorLinkTokenResult>;
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
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function buildLegacyRecord(
  id: string,
  data: Record<string, unknown>
): StoredMobileClientEditorLinkTokenRecord | null {
  const pageSlug = typeof data.pageSlug === 'string' ? data.pageSlug.trim() : '';
  const tokenHash = typeof data.tokenHash === 'string' ? data.tokenHash.trim() : '';
  const purpose =
    data.purpose === 'mobile-login' ? (data.purpose as MobileClientEditorLinkTokenPurpose) : null;
  const passwordVersion =
    typeof data.passwordVersion === 'number' && Number.isFinite(data.passwordVersion)
      ? data.passwordVersion
      : null;
  const createdAt = toDate(data.createdAt);
  const expiresAt = toDate(data.expiresAt);

  if (!pageSlug || !tokenHash || !purpose || passwordVersion === null || !createdAt || !expiresAt) {
    return null;
  }

  return {
    id,
    pageSlug,
    eventId: null,
    tokenHash,
    purpose,
    passwordVersion,
    createdAt,
    expiresAt,
    usedAt: toDate(data.usedAt),
    revokedAt: toDate(data.revokedAt),
    lastValidatedAt: toDate(data.lastValidatedAt),
    issuedBy: typeof data.issuedBy === 'string' ? data.issuedBy.trim() || null : null,
    issuedByType:
      typeof data.issuedByType === 'string' ? data.issuedByType.trim() || null : null,
  };
}

function isActiveRecord(record: StoredMobileClientEditorLinkTokenRecord, now = new Date()) {
  return !record.usedAt && !record.revokedAt && record.expiresAt.getTime() > now.getTime();
}

async function buildEventRecordFromSnapshot(snapshot: {
  id: string;
  data(): Record<string, unknown> | undefined;
  ref: { parent: { parent: { id: string } | null } };
}) {
  const eventId = snapshot.ref.parent.parent?.id?.trim();
  if (!eventId) {
    return null;
  }

  const summary = await findStoredEventSummaryById(eventId);
  if (!summary) {
    return null;
  }

  return buildEventLinkTokenRecordFromEventDoc(summary, snapshot.id, snapshot.data() ?? {});
}

async function fetchEventTokenByTokenHash(tokenHash: string) {
  const normalizedTokenHash = tokenHash.trim();
  if (!normalizedTokenHash) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db
    .collectionGroup(EVENT_LINK_TOKEN_COLLECTION)
    .where('tokenHash', '==', normalizedTokenHash)
    .limit(1)
    .get();
  const tokenDoc = snapshot.docs[0] ?? null;
  return tokenDoc ? buildEventRecordFromSnapshot(tokenDoc) : null;
}

async function fetchLegacyTokenByTokenHash(tokenHash: string) {
  const normalizedTokenHash = tokenHash.trim();
  if (!normalizedTokenHash) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db
    .collection(LEGACY_LINK_TOKEN_COLLECTION)
    .where('tokenHash', '==', normalizedTokenHash)
    .limit(1)
    .get();
  const tokenDoc = snapshot.docs[0] ?? null;
  return tokenDoc ? buildLegacyRecord(tokenDoc.id, tokenDoc.data() ?? {}) : null;
}

async function findEventTokenSnapshotById(tokenId: string) {
  const normalizedTokenId = tokenId.trim();
  if (!normalizedTokenId) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db
    .collectionGroup(EVENT_LINK_TOKEN_COLLECTION)
    .where(FieldPath.documentId(), '==', normalizedTokenId)
    .limit(1)
    .get();

  return snapshot.docs[0] ?? null;
}

async function findLegacyTokenSnapshotById(tokenId: string) {
  const normalizedTokenId = tokenId.trim();
  if (!normalizedTokenId) {
    return null;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const snapshot = await db.collection(LEGACY_LINK_TOKEN_COLLECTION).doc(normalizedTokenId).get();
  return snapshot.exists ? snapshot : null;
}

async function writeMirroredEventToken(
  tokenRecord: StoredMobileClientEditorLinkTokenRecord
) {
  const mirroredEvent = await ensureEventMirrorBySlug(tokenRecord.pageSlug, {
    forceCreate: true,
    now: tokenRecord.lastValidatedAt ?? tokenRecord.createdAt ?? new Date(),
  });
  if (!mirroredEvent) {
    throw new Error('Failed to ensure event mirror for link token write.');
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  await db
    .collection(EVENTS_COLLECTION)
    .doc(mirroredEvent.summary.eventId)
    .collection(EVENT_LINK_TOKEN_COLLECTION)
    .doc(tokenRecord.id)
    .set(
      {
        eventId: mirroredEvent.summary.eventId,
        slug: mirroredEvent.summary.slug,
        pageSlug: tokenRecord.pageSlug,
        tokenHash: tokenRecord.tokenHash,
        purpose: tokenRecord.purpose,
        passwordVersion: tokenRecord.passwordVersion,
        createdAt: tokenRecord.createdAt,
        expiresAt: tokenRecord.expiresAt,
        usedAt: tokenRecord.usedAt,
        revokedAt: tokenRecord.revokedAt,
        lastValidatedAt: tokenRecord.lastValidatedAt,
        issuedBy: tokenRecord.issuedBy,
        issuedByType: tokenRecord.issuedByType,
      },
      { merge: true }
    );

  return {
    ...tokenRecord,
    eventId: mirroredEvent.summary.eventId,
  } satisfies StoredMobileClientEditorLinkTokenRecord;
}

async function revokeEventTokenOnly(tokenId: string, now: Date) {
  const eventSnapshot = await findEventTokenSnapshotById(tokenId);
  if (!eventSnapshot) {
    return null;
  }

  const record = await buildEventRecordFromSnapshot(eventSnapshot);
  if (!record) {
    return null;
  }

  await eventSnapshot.ref.set(
    {
      revokedAt: now,
      lastValidatedAt: now,
    },
    { merge: true }
  );

  return {
    ...record,
    revokedAt: now,
    lastValidatedAt: now,
  };
}

async function revokeActiveEventTokensOnly(
  pageSlug: string,
  purpose: MobileClientEditorLinkTokenPurpose,
  now: Date
) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return 0;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  const eventSnapshot = await db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(EVENT_LINK_TOKEN_COLLECTION)
    .where('purpose', '==', purpose)
    .get();
  const activeEventDocs = await Promise.all(
    eventSnapshot.docs.map(async (docSnapshot) => {
      const record = await buildEventRecordFromSnapshot(docSnapshot);
      return record && isActiveRecord(record, now) ? docSnapshot : null;
    })
  );
  const filteredActiveEventDocs = activeEventDocs.filter((entry) => entry != null);
  if (!filteredActiveEventDocs.length) {
    return 0;
  }

  const batch = db.batch();
  filteredActiveEventDocs.forEach((docSnapshot) => {
    batch.update(docSnapshot.ref, {
      revokedAt: now,
      lastValidatedAt: now,
    });
  });
  await batch.commit();

  return filteredActiveEventDocs.length;
}

async function consumeEventTokenOnly(
  tokenId: string,
  expectedPasswordVersion: number,
  now: Date
) {
  const eventSnapshot = await findEventTokenSnapshotById(tokenId);
  if (!eventSnapshot) {
    return {
      status: 'invalid',
      record: null,
    } satisfies ConsumeMobileClientEditorLinkTokenResult;
  }

  const db = getServerFirestore();
  if (!db) {
    throw new Error('Server Firestore is not available.');
  }

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventSnapshot.ref);
    const freshRecord = await buildEventRecordFromSnapshot(snapshot);

    if (!freshRecord) {
      return {
        status: 'invalid',
        record: null,
      } satisfies ConsumeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.revokedAt) {
      return {
        status: 'revoked',
        record: freshRecord,
      } satisfies ConsumeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.usedAt) {
      return {
        status: 'used',
        record: freshRecord,
      } satisfies ConsumeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.expiresAt.getTime() <= now.getTime()) {
      return {
        status: 'expired',
        record: freshRecord,
      } satisfies ConsumeMobileClientEditorLinkTokenResult;
    }

    if (freshRecord.passwordVersion !== expectedPasswordVersion) {
      transaction.set(
        eventSnapshot.ref,
        {
          revokedAt: now,
          lastValidatedAt: now,
        },
        { merge: true }
      );

      return {
        status: 'revoked',
        record: {
          ...freshRecord,
          revokedAt: now,
          lastValidatedAt: now,
        },
      } satisfies ConsumeMobileClientEditorLinkTokenResult;
    }

    transaction.set(
      eventSnapshot.ref,
      {
        usedAt: now,
        lastValidatedAt: now,
      },
      { merge: true }
    );

    return {
      status: 'ok',
      record: {
        ...freshRecord,
        usedAt: now,
        lastValidatedAt: now,
      },
    } satisfies ConsumeMobileClientEditorLinkTokenResult;
  });
}

export const firestoreEventLinkTokenRepository: EventLinkTokenRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async findByTokenHash(tokenHash) {
    return loadReadThroughValue({
      preferred: () => fetchEventTokenByTokenHash(tokenHash),
      fallback: () => fetchLegacyTokenByTokenHash(tokenHash),
    });
  },

  async create(input) {
    const normalizedPageSlug = input.pageSlug.trim();
    if (!normalizedPageSlug) {
      throw new Error('Page slug is required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const docRef = db.collection(LEGACY_LINK_TOKEN_COLLECTION).doc();
    const legacyRecord: StoredMobileClientEditorLinkTokenRecord = {
      id: docRef.id,
      pageSlug: normalizedPageSlug,
      eventId: null,
      tokenHash: input.tokenHash,
      purpose: input.purpose,
      passwordVersion: input.passwordVersion,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      usedAt: null,
      revokedAt: null,
      lastValidatedAt: null,
      issuedBy: input.issuedBy?.trim() || null,
      issuedByType: input.issuedByType?.trim() || 'mobile-owner-session',
    };

    const createdRecord = await executeWriteThrough({
      operation: 'createEventLinkToken',
      pageSlug: normalizedPageSlug,
      legacyCollection: LEGACY_LINK_TOKEN_COLLECTION,
      eventCollection: `${EVENTS_COLLECTION}/{eventId}/${EVENT_LINK_TOKEN_COLLECTION}`,
      payload: {
        tokenId: legacyRecord.id,
        purpose: legacyRecord.purpose,
        passwordVersion: legacyRecord.passwordVersion,
      },
      legacyWrite: async () => {
        await docRef.set({
          pageSlug: normalizedPageSlug,
          tokenHash: input.tokenHash,
          purpose: input.purpose,
          passwordVersion: input.passwordVersion,
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
          usedAt: null,
          revokedAt: null,
          lastValidatedAt: null,
          issuedBy: legacyRecord.issuedBy,
          issuedByType: legacyRecord.issuedByType,
        });

        return legacyRecord;
      },
      eventWrite: async () => {
        return writeMirroredEventToken(legacyRecord);
      },
    });

    return createdRecord;
  },

  async revokeActiveByPageSlug(pageSlug, purpose, now = new Date()) {
    const normalizedPageSlug = pageSlug.trim();
    if (!normalizedPageSlug) {
      return 0;
    }

    if (getEventRolloutWriteMode() === 'event-only') {
      return revokeActiveEventTokensOnly(normalizedPageSlug, purpose, now);
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const legacySnapshot = await db
      .collection(LEGACY_LINK_TOKEN_COLLECTION)
      .where('pageSlug', '==', normalizedPageSlug)
      .where('purpose', '==', purpose)
      .get();
    const activeLegacyRecords = legacySnapshot.docs
      .map((docSnapshot) => buildLegacyRecord(docSnapshot.id, docSnapshot.data() ?? {}))
      .filter((record): record is StoredMobileClientEditorLinkTokenRecord => {
        return record ? isActiveRecord(record, now) : false;
      });

    if (activeLegacyRecords.length > 0) {
      await executeWriteThrough({
        operation: 'revokeActiveEventLinkTokens',
        pageSlug: normalizedPageSlug,
        legacyCollection: LEGACY_LINK_TOKEN_COLLECTION,
        eventCollection: `${EVENTS_COLLECTION}/{eventId}/${EVENT_LINK_TOKEN_COLLECTION}`,
        payload: {
          purpose,
          tokenCount: activeLegacyRecords.length,
        },
        legacyWrite: async () => {
          const batch = db.batch();
          activeLegacyRecords.forEach((record) => {
            batch.update(
              db.collection(LEGACY_LINK_TOKEN_COLLECTION).doc(record.id),
              {
                revokedAt: now,
                lastValidatedAt: now,
              }
            );
          });
          await batch.commit();

          return activeLegacyRecords.length;
        },
        eventWrite: async () => {
          await Promise.all(
            activeLegacyRecords.map((record) =>
              writeMirroredEventToken({
                ...record,
                revokedAt: now,
                lastValidatedAt: now,
              })
            )
          );

          return activeLegacyRecords.length;
        },
      });

      return activeLegacyRecords.length;
    }

    return revokeActiveEventTokensOnly(normalizedPageSlug, purpose, now);
  },

  async revokeById(tokenId, now = new Date()) {
    const normalizedTokenId = tokenId.trim();
    if (!normalizedTokenId) {
      return null;
    }

    if (getEventRolloutWriteMode() === 'event-only') {
      return revokeEventTokenOnly(normalizedTokenId, now);
    }

    const legacySnapshot = await findLegacyTokenSnapshotById(normalizedTokenId);
    if (legacySnapshot) {
      const legacyRecord = buildLegacyRecord(legacySnapshot.id, legacySnapshot.data() ?? {});
      if (!legacyRecord) {
        return null;
      }

      const nextRecord = {
        ...legacyRecord,
        revokedAt: now,
        lastValidatedAt: now,
      };

      await executeWriteThrough({
        operation: 'revokeEventLinkToken',
        pageSlug: legacyRecord.pageSlug,
        legacyCollection: LEGACY_LINK_TOKEN_COLLECTION,
        eventCollection: `${EVENTS_COLLECTION}/{eventId}/${EVENT_LINK_TOKEN_COLLECTION}`,
        payload: {
          tokenId: normalizedTokenId,
        },
        legacyWrite: async () => {
          await legacySnapshot.ref.set(
            {
              revokedAt: now,
              lastValidatedAt: now,
            },
            { merge: true }
          );

          return nextRecord;
        },
        eventWrite: async () => {
          await writeMirroredEventToken(nextRecord);
          return nextRecord;
        },
      });

      return nextRecord;
    }

    return revokeEventTokenOnly(normalizedTokenId, now);
  },

  async consumeById(tokenId, expectedPasswordVersion, now = new Date()) {
    const normalizedTokenId = tokenId.trim();
    if (!normalizedTokenId) {
      return {
        status: 'invalid',
        record: null,
      };
    }

    if (getEventRolloutWriteMode() === 'event-only') {
      return consumeEventTokenOnly(normalizedTokenId, expectedPasswordVersion, now);
    }

    const legacySnapshot = await findLegacyTokenSnapshotById(normalizedTokenId);
    if (!legacySnapshot) {
      return consumeEventTokenOnly(normalizedTokenId, expectedPasswordVersion, now);
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    let primaryResult: ConsumeMobileClientEditorLinkTokenResult = {
      status: 'invalid',
      record: null,
    };

    await executeWriteThrough({
      operation: 'consumeEventLinkToken',
      pageSlug: buildLegacyRecord(legacySnapshot.id, legacySnapshot.data() ?? {})?.pageSlug ?? '',
      legacyCollection: LEGACY_LINK_TOKEN_COLLECTION,
      eventCollection: `${EVENTS_COLLECTION}/{eventId}/${EVENT_LINK_TOKEN_COLLECTION}`,
      payload: {
        tokenId: normalizedTokenId,
        expectedPasswordVersion,
      },
      legacyWrite: async () => {
        primaryResult = await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(legacySnapshot.ref);
          const freshRecord = buildLegacyRecord(normalizedTokenId, snapshot.data() ?? {});

          if (!freshRecord) {
            return {
              status: 'invalid',
              record: null,
            } satisfies ConsumeMobileClientEditorLinkTokenResult;
          }

          if (freshRecord.revokedAt) {
            return {
              status: 'revoked',
              record: freshRecord,
            } satisfies ConsumeMobileClientEditorLinkTokenResult;
          }

          if (freshRecord.usedAt) {
            return {
              status: 'used',
              record: freshRecord,
            } satisfies ConsumeMobileClientEditorLinkTokenResult;
          }

          if (freshRecord.expiresAt.getTime() <= now.getTime()) {
            return {
              status: 'expired',
              record: freshRecord,
            } satisfies ConsumeMobileClientEditorLinkTokenResult;
          }

          if (freshRecord.passwordVersion !== expectedPasswordVersion) {
            transaction.set(
              legacySnapshot.ref,
              {
                revokedAt: now,
                lastValidatedAt: now,
              },
              { merge: true }
            );

            return {
              status: 'revoked',
              record: {
                ...freshRecord,
                revokedAt: now,
                lastValidatedAt: now,
              },
            } satisfies ConsumeMobileClientEditorLinkTokenResult;
          }

          transaction.set(
            legacySnapshot.ref,
            {
              usedAt: now,
              lastValidatedAt: now,
            },
            { merge: true }
          );

          return {
            status: 'ok',
            record: {
              ...freshRecord,
              usedAt: now,
              lastValidatedAt: now,
            },
          } satisfies ConsumeMobileClientEditorLinkTokenResult;
        });

        return primaryResult;
      },
      eventWrite: async () => {
        if (primaryResult.record) {
          return writeMirroredEventToken(primaryResult.record);
        }

        return primaryResult;
      },
    });

    return primaryResult;
  },
};
