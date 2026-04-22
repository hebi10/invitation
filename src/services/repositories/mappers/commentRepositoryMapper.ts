import { isGuestbookCommentVisibleToPublic } from '@/lib/guestbookComments';

import { toClientRepositoryDate } from '../clientFirestoreRepositoryCore';

export interface RepositoryComment {
  id: string;
  author: string;
  message: string;
  createdAt: Date;
  pageSlug: string;
  collectionName?: string;
}

export function buildEventCommentCollectionPath(eventId: string) {
  return `events/${eventId}/comments`;
}

export function normalizeRepositoryComment(
  id: string,
  data: Record<string, any>,
  options: {
    pageSlug?: string;
    collectionName?: string;
  } = {}
): RepositoryComment | null {
  if (!isGuestbookCommentVisibleToPublic(data)) {
    return null;
  }

  const pageSlug = data.pageSlug ?? options.pageSlug ?? '';
  if (typeof pageSlug !== 'string' || !pageSlug.trim()) {
    return null;
  }

  const normalizedPageSlug = pageSlug.trim();

  return {
    id,
    author: data.author ?? '',
    message: data.message ?? '',
    pageSlug: normalizedPageSlug,
    createdAt: toClientRepositoryDate(data.createdAt, new Date()),
    collectionName:
      options.collectionName ?? buildEventCommentCollectionPath(normalizedPageSlug),
  };
}
