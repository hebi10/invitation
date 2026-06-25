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

type CreateEventLinkTokenInput = {
  pageSlug: string;
  tokenHash: string;
  purpose: MobileClientEditorLinkTokenPurpose;
  passwordVersion: number;
  createdAt: Date;
  expiresAt: Date;
  issuedBy?: string | null;
  issuedByType?: string | null;
};

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

export const firestoreEventLinkTokenRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async findByTokenHash(
    tokenHash: string
  ): Promise<StoredMobileClientEditorLinkTokenRecord | null> {
    return fetchEventTokenByTokenHash(tokenHash);
  },

  async create(
    input: CreateEventLinkTokenInput
  ): Promise<StoredMobileClientEditorLinkTokenRecord> {
    const normalizedPageSlug = input.pageSlug.trim();
    if (!normalizedPageSlug) {
      throw new Error('Page slug is required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const mirroredEvent = await ensureEventMirrorBySlug(normalizedPageSlug, {
      forceCreate: true,
      now: input.createdAt,
    });
    if (!mirroredEvent) {
      throw new Error('Failed to ensure event mirror for link token write.');
    }

    const docRef = db
      .collection(EVENTS_COLLECTION)
      .doc(mirroredEvent.summary.eventId)
      .collection(EVENT_LINK_TOKEN_COLLECTION)
      .doc();
    const createdRecord: StoredMobileClientEditorLinkTokenRecord = {
      id: docRef.id,
      pageSlug: normalizedPageSlug,
      eventId: mirroredEvent.summary.eventId,
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

    await docRef.set({
      eventId: mirroredEvent.summary.eventId,
      slug: mirroredEvent.summary.slug,
      pageSlug: normalizedPageSlug,
      tokenHash: input.tokenHash,
      purpose: input.purpose,
      passwordVersion: input.passwordVersion,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      usedAt: null,
      revokedAt: null,
      lastValidatedAt: null,
      issuedBy: createdRecord.issuedBy,
      issuedByType: createdRecord.issuedByType,
    });

    return createdRecord;
  },

  async revokeActiveByPageSlug(
    pageSlug: string,
    purpose: MobileClientEditorLinkTokenPurpose,
    now = new Date()
  ): Promise<number> {
    const normalizedPageSlug = pageSlug.trim();
    if (!normalizedPageSlug) {
      return 0;
    }

    return revokeActiveEventTokensOnly(normalizedPageSlug, purpose, now);
  },

  async revokeById(
    tokenId: string,
    now = new Date()
  ): Promise<StoredMobileClientEditorLinkTokenRecord | null> {
    const normalizedTokenId = tokenId.trim();
    if (!normalizedTokenId) {
      return null;
    }

    return revokeEventTokenOnly(normalizedTokenId, now);
  },

  async consumeById(
    tokenId: string,
    expectedPasswordVersion: number,
    now = new Date()
  ): Promise<ConsumeMobileClientEditorLinkTokenResult> {
    const normalizedTokenId = tokenId.trim();
    if (!normalizedTokenId) {
      return {
        status: 'invalid',
        record: null,
      };
    }

    return consumeEventTokenOnly(normalizedTokenId, expectedPasswordVersion, now);
  },
};
