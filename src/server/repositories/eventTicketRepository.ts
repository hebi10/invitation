import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import {
  ensureEventMirrorBySlug,
  EVENTS_COLLECTION,
  resolveStoredEventBySlug,
} from './eventRepository';
import { normalizeEventSummaryRecord } from './eventReadThroughDtos';

export interface EventTicketRepository {
  isAvailable(): boolean;
  getTicketCountByPageSlug(pageSlug: string): Promise<number>;
  adjustTicketCountByPageSlug(pageSlug: string, amount: number): Promise<number>;
  transferTicketCountByPageSlug(
    sourcePageSlug: string,
    targetPageSlug: string,
    amount: number
  ): Promise<{
    sourceTicketCount: number;
    targetTicketCount: number;
  }>;
}

function normalizePageSlug(pageSlug: string) {
  return pageSlug.trim();
}

function readTicketCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

async function fetchEventTicketCountByPageSlug(pageSlug: string) {
  const resolvedEvent = await resolveStoredEventBySlug(pageSlug);
  if (!resolvedEvent) {
    return null;
  }

  return readTicketCount(
    resolvedEvent.summary.ticketBalance ?? resolvedEvent.summary.ticketCount ?? 0
  );
}

async function ensureEventTicketState(pageSlug: string, now = new Date()) {
  const mirroredEvent =
    (await resolveStoredEventBySlug(pageSlug)) ??
    (await ensureEventMirrorBySlug(pageSlug, {
      forceCreate: true,
      now,
    }));

  if (!mirroredEvent) {
    throw new Error('Target page slug and session are required.');
  }

  return mirroredEvent;
}

export const firestoreEventTicketRepository: EventTicketRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async getTicketCountByPageSlug(pageSlug) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      return 0;
    }

    return (await fetchEventTicketCountByPageSlug(normalizedPageSlug)) ?? 0;
  },

  async adjustTicketCountByPageSlug(pageSlug, amount) {
    const normalizedPageSlug = normalizePageSlug(pageSlug);
    if (!normalizedPageSlug) {
      throw new Error('Page slug is required.');
    }

    const normalizedAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;
    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const mirroredEvent = await ensureEventTicketState(normalizedPageSlug);
    const eventRef = db.collection(EVENTS_COLLECTION).doc(mirroredEvent.summary.eventId);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(eventRef);
      const summary = snapshot.exists
        ? normalizeEventSummaryRecord(snapshot.id, snapshot.data() ?? {}, normalizedPageSlug)
        : mirroredEvent.summary;
      const currentCount = readTicketCount(
        summary?.ticketBalance ?? summary?.ticketCount ?? 0
      );
      const nextCount = Math.max(0, currentCount + normalizedAmount);

      transaction.set(
        eventRef,
        {
          eventId: mirroredEvent.summary.eventId,
          slug: mirroredEvent.summary.slug,
          eventType: mirroredEvent.summary.eventType,
          stats: {
            commentCount: summary?.commentCount ?? mirroredEvent.summary.commentCount ?? 0,
            ticketCount: nextCount,
            ticketBalance: nextCount,
          },
          updatedAt: new Date(),
          version: (summary?.version ?? mirroredEvent.summary.version ?? 0) + 1,
        },
        { merge: true }
      );

      return nextCount;
    });
  },

  async transferTicketCountByPageSlug(sourcePageSlug, targetPageSlug, amount) {
    const normalizedSourcePageSlug = normalizePageSlug(sourcePageSlug);
    const normalizedTargetPageSlug = normalizePageSlug(targetPageSlug);
    const normalizedAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;

    if (!normalizedSourcePageSlug || !normalizedTargetPageSlug) {
      throw new Error('Target page slug and session are required.');
    }

    if (normalizedSourcePageSlug === normalizedTargetPageSlug) {
      throw new Error('Target page slug must be different.');
    }

    if (normalizedAmount <= 0) {
      throw new Error('Transfer ticket count amount is required.');
    }

    const db = getServerFirestore();
    if (!db) {
      throw new Error('Server Firestore is not available.');
    }

    const [sourceEvent, targetEvent] = await Promise.all([
      ensureEventTicketState(normalizedSourcePageSlug),
      ensureEventTicketState(normalizedTargetPageSlug),
    ]);

    const sourceRef = db.collection(EVENTS_COLLECTION).doc(sourceEvent.summary.eventId);
    const targetRef = db.collection(EVENTS_COLLECTION).doc(targetEvent.summary.eventId);

    return db.runTransaction(async (transaction) => {
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        transaction.get(sourceRef),
        transaction.get(targetRef),
      ]);

      const sourceSummary = sourceSnapshot.exists
        ? normalizeEventSummaryRecord(
            sourceSnapshot.id,
            sourceSnapshot.data() ?? {},
            normalizedSourcePageSlug
          )
        : sourceEvent.summary;
      const targetSummary = targetSnapshot.exists
        ? normalizeEventSummaryRecord(
            targetSnapshot.id,
            targetSnapshot.data() ?? {},
            normalizedTargetPageSlug
          )
        : targetEvent.summary;

      const sourceTicketCount = readTicketCount(
        sourceSummary?.ticketBalance ?? sourceSummary?.ticketCount ?? 0
      );
      const targetTicketCount = readTicketCount(
        targetSummary?.ticketBalance ?? targetSummary?.ticketCount ?? 0
      );

      if (sourceTicketCount < normalizedAmount) {
        throw new Error('Not enough tickets.');
      }

      const nextSourceTicketCount = sourceTicketCount - normalizedAmount;
      const nextTargetTicketCount = targetTicketCount + normalizedAmount;

      transaction.set(
        sourceRef,
        {
          eventId: sourceEvent.summary.eventId,
          slug: sourceEvent.summary.slug,
          eventType: sourceEvent.summary.eventType,
          stats: {
            commentCount:
              sourceSummary?.commentCount ?? sourceEvent.summary.commentCount ?? 0,
            ticketCount: nextSourceTicketCount,
            ticketBalance: nextSourceTicketCount,
          },
          updatedAt: new Date(),
          version: (sourceSummary?.version ?? sourceEvent.summary.version ?? 0) + 1,
        },
        { merge: true }
      );

      transaction.set(
        targetRef,
        {
          eventId: targetEvent.summary.eventId,
          slug: targetEvent.summary.slug,
          eventType: targetEvent.summary.eventType,
          stats: {
            commentCount:
              targetSummary?.commentCount ?? targetEvent.summary.commentCount ?? 0,
            ticketCount: nextTargetTicketCount,
            ticketBalance: nextTargetTicketCount,
          },
          updatedAt: new Date(),
          version: (targetSummary?.version ?? targetEvent.summary.version ?? 0) + 1,
        },
        { merge: true }
      );

      return {
        sourceTicketCount: nextSourceTicketCount,
        targetTicketCount: nextTargetTicketCount,
      };
    });
  },
};
