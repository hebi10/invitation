import 'server-only';

import {
  isGuestbookCommentVisibleToPublic,
  readGuestbookCommentDate,
} from '@/lib/guestbookComments';

import { getServerFirestore } from '../firebaseAdmin';
import type { EventSummaryRecord } from './eventReadThroughDtos';
import { EVENTS_COLLECTION } from './eventRepository';

const COMMENTS_COLLECTION = 'comments';
const MEMORY_PAGES_COLLECTION = 'memory-pages';

export interface AdminDashboardCommentCount {
  totalCount: number;
  recentCount: number;
}

export interface AdminDashboardRepository {
  isAvailable(): boolean;
  countVisibleComments(
    eventSummaries: EventSummaryRecord[],
    recentThreshold: Date
  ): Promise<AdminDashboardCommentCount>;
  countPublicMemoryPages(): Promise<number>;
}

export const firestoreAdminDashboardRepository: AdminDashboardRepository = {
  isAvailable() {
    return Boolean(getServerFirestore());
  },

  async countVisibleComments(eventSummaries, recentThreshold) {
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
  },

  async countPublicMemoryPages() {
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
  },
};
