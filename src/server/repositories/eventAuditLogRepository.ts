import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import { buildEventAuditLogRecordFromEventDoc } from './eventReadThroughDtos';
import {
  EVENTS_COLLECTION,
  ensureEventMirrorBySlug,
  resolveStoredEventBySlug,
} from './eventRepository';
import { isLegacyReadFallbackEnabled } from './eventRolloutConfig';
import { executeWriteThrough } from './writeThrough';

const LEGACY_EVENT_AUDIT_LOG_COLLECTION = 'mobile-client-editor-audit-logs';
const EVENT_AUDIT_LOG_COLLECTION = 'auditLogs';

export interface EventAuditLogEntry {
  action: string;
  result: 'success' | 'failure';
  pageSlug: string;
  sessionPageSlug?: string | null;
  reason?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface StoredEventAuditLogRecord {
  id: string;
  pageSlug: string;
  eventId: string | null;
  action: string;
  result: 'success' | 'failure';
  sessionPageSlug: string | null;
  reason: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: Date | null;
}

export interface EventAuditLogRepository {
  isAvailable(): boolean;
  write(entry: EventAuditLogEntry): Promise<void>;
  listByPageSlug(pageSlug: string, limit?: number): Promise<StoredEventAuditLogRecord[]>;
}

function normalizeMetadata(value: Record<string, string | number | boolean | null | undefined>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as Record<string, string | number | boolean | null>;
}

async function fetchLegacyAuditLogsByPageSlug(pageSlug: string, limit: number) {
  const db = getServerFirestore();
  if (!db) {
    return [];
  }

  const snapshot = await db
    .collection(LEGACY_EVENT_AUDIT_LOG_COLLECTION)
    .where('pageSlug', '==', pageSlug)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    eventId: null,
    pageSlug,
    action:
      typeof docSnapshot.data().action === 'string' ? docSnapshot.data().action.trim() : '',
    result:
      docSnapshot.data().result === 'failure'
        ? ('failure' as const)
        : ('success' as const),
    sessionPageSlug:
      typeof docSnapshot.data().sessionPageSlug === 'string' &&
      docSnapshot.data().sessionPageSlug.trim()
        ? docSnapshot.data().sessionPageSlug.trim()
        : null,
    reason:
      typeof docSnapshot.data().reason === 'string' && docSnapshot.data().reason.trim()
        ? docSnapshot.data().reason.trim()
        : null,
    metadata:
      typeof docSnapshot.data().metadata === 'object' && docSnapshot.data().metadata !== null
        ? normalizeMetadata(docSnapshot.data().metadata as Record<
            string,
            string | number | boolean | null | undefined
          >)
        : {},
    createdAt:
      typeof docSnapshot.data().createdAt?.toDate === 'function'
        ? docSnapshot.data().createdAt.toDate()
        : docSnapshot.data().createdAt instanceof Date
          ? docSnapshot.data().createdAt
          : null,
  }));
}

async function fetchEventAuditLogsByPageSlug(pageSlug: string, limit: number) {
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
    .collection(EVENT_AUDIT_LOG_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return {
    authoritative: snapshot.size > 0,
    records: snapshot.docs
      .map((docSnapshot) =>
        buildEventAuditLogRecordFromEventDoc(
          resolvedEvent.summary,
          docSnapshot.id,
          docSnapshot.data() ?? {}
        )
      )
      .filter((record): record is StoredEventAuditLogRecord => record != null),
  };
}

export const firestoreEventAuditLogRepository: EventAuditLogRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async write(entry) {
    const db = getServerFirestore();
    if (!db) {
      return;
    }

    const safeMetadata = normalizeMetadata(entry.metadata ?? {});
    const now = new Date();
    const legacyDocRef = db.collection(LEGACY_EVENT_AUDIT_LOG_COLLECTION).doc();

    await executeWriteThrough({
      operation: 'writeEventAuditLog',
      pageSlug: entry.pageSlug,
      legacyCollection: LEGACY_EVENT_AUDIT_LOG_COLLECTION,
      eventCollection: `${EVENTS_COLLECTION}/{eventId}/${EVENT_AUDIT_LOG_COLLECTION}`,
      payload: {
        action: entry.action,
        result: entry.result,
      },
      legacyWrite: async () => {
        await legacyDocRef.set({
          action: entry.action,
          result: entry.result,
          pageSlug: entry.pageSlug,
          sessionPageSlug: entry.sessionPageSlug ?? null,
          reason: entry.reason?.trim() ? entry.reason.trim() : null,
          metadata: safeMetadata,
          createdAt: now,
        });

        return undefined;
      },
      eventWrite: async () => {
        const mirroredEvent = await ensureEventMirrorBySlug(entry.pageSlug, {
          forceCreate: true,
          now,
        });
        if (!mirroredEvent) {
          throw new Error('Failed to ensure event mirror for audit log write.');
        }

        await db
          .collection(EVENTS_COLLECTION)
          .doc(mirroredEvent.summary.eventId)
          .collection(EVENT_AUDIT_LOG_COLLECTION)
          .doc(legacyDocRef.id)
          .set({
            eventId: mirroredEvent.summary.eventId,
            slug: mirroredEvent.summary.slug,
            pageSlug: entry.pageSlug,
            action: entry.action,
            result: entry.result,
            sessionPageSlug: entry.sessionPageSlug ?? null,
            actor: {
              type: 'mobile-owner-session',
              sessionEventId: entry.sessionPageSlug ?? null,
            },
            reason: entry.reason?.trim() ? entry.reason.trim() : null,
            metadata: safeMetadata,
            createdAt: now,
          });

        return undefined;
      },
    });
  },

  async listByPageSlug(pageSlug, limit = 20) {
    const normalizedPageSlug = pageSlug.trim();
    if (!normalizedPageSlug) {
      return [];
    }

    const preferred = await fetchEventAuditLogsByPageSlug(normalizedPageSlug, limit);
    if (preferred && preferred.authoritative) {
      return preferred.records;
    }

    if (!isLegacyReadFallbackEnabled()) {
      return preferred?.records ?? [];
    }

    return fetchLegacyAuditLogsByPageSlug(normalizedPageSlug, limit);
  },
};
