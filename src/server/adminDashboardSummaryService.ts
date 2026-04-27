import 'server-only';

import { DUE_SOON_DAYS, RECENT_COMMENT_DAYS } from '@/app/admin/_components/adminPageUtils';

import { firestoreAdminDashboardRepository } from './repositories/adminDashboardRepository';
import { listStoredEventSummaries } from './repositories/eventRepository';

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

export async function getAdminDashboardSummarySnapshot(): Promise<AdminDashboardSummarySnapshot> {
  const recentThreshold = new Date(
    Date.now() - RECENT_COMMENT_DAYS * 24 * 60 * 60 * 1000
  );
  const [eventSummaries, memoryPublicCount] = await Promise.all([
    listStoredEventSummaries(),
    firestoreAdminDashboardRepository.countPublicMemoryPages(),
  ]);
  const commentSummary = await firestoreAdminDashboardRepository.countVisibleComments(
    eventSummaries,
    recentThreshold
  );

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
