import 'server-only';

import { DUE_SOON_DAYS, RECENT_COMMENT_DAYS } from '@/app/admin/_components/adminPageUtils';
import {
  isGuestbookCommentVisibleToPublic,
  readGuestbookCommentDate,
} from '@/lib/guestbookComments';

import { getServerFirestore } from './firebaseAdmin';
import { EVENTS_COLLECTION, listStoredEventSummaries } from './repositories/eventRepository';

const COMMENTS_COLLECTION = 'comments';
const MEMORY_PAGES_COLLECTION = 'memory-pages';

export interface AdminDashboardSummarySnapshot {
  invitationCount: number;
  restrictedCount: number;
  dueSoonCount: number;
  memoryPublicCount: number;
  commentSummary: {
    totalCount: number;
    recentCount: number;
    recentDays: number;
  };
}

function isDueSoon(startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) {
    return false;
  }

  const now = new Date();
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return now >= startDate && now <= endDate && diffDays <= DUE_SOON_DAYS;
}

async function countVisibleComments(
  eventSummaries: Awaited<ReturnType<typeof listStoredEventSummaries>>,
  recentThreshold: Date
) {
  const db = getServerFirestore();
  if (!db) {
    return {
      totalCount: 0,
      recentCount: 0,
    };
  }

  const snapshots = await Promise.all(
    eventSummaries.map((summary) =>
      db
        .collection(EVENTS_COLLECTION)
        .doc(summary.eventId)
        .collection(COMMENTS_COLLECTION)
        .get()
    )
  );

  let totalCount = 0;
  let recentCount = 0;

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data() ?? {};
      if (!isGuestbookCommentVisibleToPublic(data)) {
        return;
      }

      totalCount += 1;

      const createdAt = readGuestbookCommentDate(data.createdAt);
      if (createdAt && createdAt >= recentThreshold) {
        recentCount += 1;
      }
    });
  });

  return {
    totalCount,
    recentCount,
  };
}

async function getMemoryPublicCount() {
  const db = getServerFirestore();
  if (!db) {
    return 0;
  }

  const snapshot = await db
    .collection(MEMORY_PAGES_COLLECTION)
    .where('enabled', '==', true)
    .get();

  return snapshot.docs.filter((docSnapshot) => docSnapshot.data().visibility !== 'private')
    .length;
}

export async function getAdminDashboardSummarySnapshot(): Promise<AdminDashboardSummarySnapshot> {
  const recentThreshold = new Date(
    Date.now() - RECENT_COMMENT_DAYS * 24 * 60 * 60 * 1000
  );
  const [eventSummaries, memoryPublicCount] = await Promise.all([
    listStoredEventSummaries(),
    getMemoryPublicCount(),
  ]);
  const commentSummary = await countVisibleComments(eventSummaries, recentThreshold);

  return {
    invitationCount: eventSummaries.length,
    restrictedCount: eventSummaries.filter(
      (summary) => summary.displayPeriod?.isActive === true
    ).length,
    dueSoonCount: eventSummaries.filter((summary) =>
      isDueSoon(summary.displayPeriod?.startDate ?? null, summary.displayPeriod?.endDate ?? null)
    ).length,
    memoryPublicCount,
    commentSummary: {
      totalCount: commentSummary.totalCount,
      recentCount: commentSummary.recentCount,
      recentDays: RECENT_COMMENT_DAYS,
    },
  };
}
