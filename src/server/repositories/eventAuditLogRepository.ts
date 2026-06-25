import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import { buildEventAuditLogRecordFromEventDoc } from './eventReadThroughDtos';
import {
  EVENTS_COLLECTION,
  ensureEventMirrorBySlug,
  resolveStoredEventBySlug,
} from './eventRepository';

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

function normalizeMetadata(value: Record<string, string | number | boolean | null | undefined>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as Record<string, string | number | boolean | null>;
}

async function fetchEventAuditLogsByPageSlug(pageSlug: string, limit: number) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return [];
  }

  const db = getServerFirestore();
  if (!db) {
    return [];
  }

  const snapshot = await db
    .collection(EVENTS_COLLECTION)
    .doc(resolvedEvent.summary.eventId)
    .collection(EVENT_AUDIT_LOG_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map((docSnapshot) =>
      buildEventAuditLogRecordFromEventDoc(
        resolvedEvent.summary,
        docSnapshot.id,
        docSnapshot.data() ?? {}
      )
    )
    .filter((record): record is StoredEventAuditLogRecord => record != null);
}

export const firestoreEventAuditLogRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async write(entry: EventAuditLogEntry) {
    const db = getServerFirestore();
    if (!db) {
      return;
    }

    const safeMetadata = normalizeMetadata(entry.metadata ?? {});
    const now = new Date();
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
      .add({
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
  },

  async listByPageSlug(pageSlug: string, limit = 20) {
    const normalizedPageSlug = pageSlug.trim();
    if (!normalizedPageSlug) {
      return [];
    }

    return fetchEventAuditLogsByPageSlug(normalizedPageSlug, limit);
  },
};
