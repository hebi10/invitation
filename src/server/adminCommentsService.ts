import 'server-only';

import {
  isGuestbookCommentVisibleToPublic,
  readGuestbookCommentDate,
} from '@/lib/guestbookComments';
import type { Comment } from '@/services/commentService';
import { buildEventCommentCollectionPath } from '@/services/repositories/mappers/commentRepositoryMapper';

import { firestoreEventCommentRepository } from './repositories/eventCommentRepository';
import { listStoredEventSummaries } from './repositories/eventRepository';

function normalizeAdminComment(
  id: string,
  data: Record<string, unknown>,
  options: {
    eventId: string;
    pageSlug: string;
  }
): Comment | null {
  if (!isGuestbookCommentVisibleToPublic(data)) {
    return null;
  }

  return {
    id,
    author: typeof data.author === 'string' ? data.author : '',
    message: typeof data.message === 'string' ? data.message : '',
    createdAt: readGuestbookCommentDate(data.createdAt) ?? new Date(0),
    pageSlug: options.pageSlug,
    collectionName: buildEventCommentCollectionPath(options.eventId),
  };
}

export async function listAdminComments() {
  const eventSummaries = await listStoredEventSummaries();
  const commentGroups = await Promise.all(
    eventSummaries.map(async (summary) => {
      const records = await firestoreEventCommentRepository.listByPageSlug(summary.slug);

      return records
        .map((record) =>
          normalizeAdminComment(record.id, record.data, {
            eventId: summary.eventId,
            pageSlug: record.pageSlug || summary.slug,
          })
        )
        .filter((comment): comment is Comment => comment !== null);
    })
  );

  return commentGroups
    .flat()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}
