import 'server-only';

import type { MobileClientEditorScope } from '@/types/mobileClientEditor';

import { getServerFirestore } from '../firebaseAdmin';

const MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION = 'mobile-client-editor-sessions';

export type MobileClientEditorSessionIssuedVia =
  | 'purchase'
  | 'link-token'
  | 'draft-create';

export interface StoredMobileClientEditorSessionRecord {
  sessionId: string;
  tokenHash: string;
  pageSlug: string;
  eventId: string | null;
  ownerUid: string | null;
  deviceIdHash: string | null;
  scopes: MobileClientEditorScope[];
  issuedVia: MobileClientEditorSessionIssuedVia;
  createdAt: Date | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface CreateMobileClientEditorSessionRecordInput {
  sessionId: string;
  tokenHash: string;
  pageSlug: string;
  eventId?: string | null;
  ownerUid?: string | null;
  deviceIdHash?: string | null;
  scopes: MobileClientEditorScope[];
  issuedVia: MobileClientEditorSessionIssuedVia;
  createdAt?: Date;
  expiresAt: Date;
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

function normalizeScopes(value: unknown): MobileClientEditorScope[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is MobileClientEditorScope => typeof entry === 'string')
    : [];
}

function buildStoredRecord(
  sessionId: string,
  data: Record<string, unknown>
): StoredMobileClientEditorSessionRecord {
  return {
    sessionId,
    tokenHash: typeof data.tokenHash === 'string' ? data.tokenHash : '',
    pageSlug: typeof data.pageSlug === 'string' ? data.pageSlug.trim() : '',
    eventId: typeof data.eventId === 'string' && data.eventId.trim() ? data.eventId.trim() : null,
    ownerUid:
      typeof data.ownerUid === 'string' && data.ownerUid.trim() ? data.ownerUid.trim() : null,
    deviceIdHash:
      typeof data.deviceIdHash === 'string' && data.deviceIdHash.trim()
        ? data.deviceIdHash.trim()
        : null,
    scopes: normalizeScopes(data.scopes),
    issuedVia:
      data.issuedVia === 'purchase' ||
      data.issuedVia === 'link-token' ||
      data.issuedVia === 'draft-create'
        ? data.issuedVia
        : 'link-token',
    createdAt: normalizeDate(data.createdAt),
    expiresAt: normalizeDate(data.expiresAt),
    lastUsedAt: normalizeDate(data.lastUsedAt),
    revokedAt: normalizeDate(data.revokedAt),
  };
}

export const firestoreMobileClientEditorSessionRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async create(input: CreateMobileClientEditorSessionRecordInput) {
    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const createdAt = input.createdAt ?? new Date();
    await db
      .collection(MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION)
      .doc(input.sessionId)
      .set({
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        pageSlug: input.pageSlug.trim(),
        eventId: input.eventId?.trim() || null,
        ownerUid: input.ownerUid?.trim() || null,
        deviceIdHash: input.deviceIdHash?.trim() || null,
        scopes: input.scopes,
        issuedVia: input.issuedVia,
        createdAt,
        expiresAt: input.expiresAt,
        lastUsedAt: null,
        revokedAt: null,
      });
  },

  async findBySessionId(sessionId: string) {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) {
      return null;
    }

    const db = getServerFirestore();
    if (!db) {
      return null;
    }

    const snapshot = await db
      .collection(MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION)
      .doc(normalizedSessionId)
      .get();
    if (!snapshot.exists) {
      return null;
    }

    return buildStoredRecord(normalizedSessionId, snapshot.data() ?? {});
  },

  async touch(sessionId: string, now = new Date()) {
    const normalizedSessionId = sessionId.trim();
    const db = getServerFirestore();
    if (!normalizedSessionId || !db) {
      return;
    }

    await db
      .collection(MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION)
      .doc(normalizedSessionId)
      .set({ lastUsedAt: now }, { merge: true });
  },

  async revoke(sessionId: string, now = new Date()) {
    const normalizedSessionId = sessionId.trim();
    const db = getServerFirestore();
    if (!normalizedSessionId || !db) {
      return;
    }

    await db
      .collection(MOBILE_CLIENT_EDITOR_SESSIONS_COLLECTION)
      .doc(normalizedSessionId)
      .set({ revokedAt: now }, { merge: true });
  },
};
