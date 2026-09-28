import { isGuestbookCommentVisibleToPublic, readGuestbookCommentDate } from './guestbookComments';

export type CommentPageRequest = { limit: number; cursor: string | null };
export type CommentPage<T> = { comments: T[]; nextCursor: string | null; hasMore: boolean };
export type CommentCursor = { mode: 'ordered' | 'legacy'; id: string; seconds: number; nanoseconds: number };

export function encodeCommentCursor(cursor: CommentCursor) {
  return encodeURIComponent(JSON.stringify(cursor));
}

export function decodeCommentCursor(value: string): CommentCursor {
  try {
    if (value.length > 4000) throw new Error();
    const cursor = JSON.parse(decodeURIComponent(value)) as CommentCursor;
    if (!cursor || !['ordered', 'legacy'].includes(cursor.mode) || typeof cursor.id !== 'string' ||
      !cursor.id || cursor.id.length > 1500 || /[/\u0000-\u001f]/.test(cursor.id) || cursor.id === '.' || cursor.id === '..' ||
      !Number.isSafeInteger(cursor.seconds) || cursor.seconds < -62135596800 || cursor.seconds > 253402300799 ||
      !Number.isInteger(cursor.nanoseconds) || cursor.nanoseconds < 0 || cursor.nanoseconds > 999999999) throw new Error();
    return cursor;
  } catch {
    throw new Error('방명록 페이지 주소를 확인해 주세요.');
  }
}

export function parseCommentPageRequest(params: URLSearchParams): CommentPageRequest | null {
  if (!params.has('limit') && !params.has('cursor')) return null;
  const limitText = params.get('limit') ?? '5';
  const limit = Number(limitText);
  if (!/^\d+$/.test(limitText) || !Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error('방명록 조회 개수를 확인해 주세요.');
  }
  const cursor = params.get('cursor');
  if (cursor !== null) decodeCommentCursor(cursor);
  return { limit, cursor };
}

type PageRecord = { id: string; data: Record<string, unknown>; cursor?: string };

/** Limit reads even when a large range contains only hidden comments. */
export async function readPublicCommentPage<T extends PageRecord>(
  request: CommentPageRequest,
  fetchBatch: (cursor: string | null, limit: number) => Promise<T[]>,
): Promise<CommentPage<T>> {
  const comments: T[] = [];
  let cursor = request.cursor;
  for (let scan = 0; scan < 4; scan += 1) {
    const batch = await fetchBatch(cursor, 25);
    for (const record of batch) {
      if (isGuestbookCommentVisibleToPublic(record.data)) {
        if (comments.length === request.limit) return { comments, nextCursor: cursor, hasMore: true };
        comments.push(record);
      }
      cursor = record.cursor ?? record.id;
    }
    if (batch.length < 25) return { comments, nextCursor: null, hasMore: false };
  }
  return { comments, nextCursor: cursor, hasMore: true };
}

/** Only used for collections with missing dates, preserving the legacy visible records. */
export function paginateLegacyComments<T extends PageRecord>(records: T[], request: CommentPageRequest): CommentPage<T> {
  const time = (record: T) => readGuestbookCommentDate(record.data.createdAt)?.getTime() ?? 0;
  const sorted = records.filter(record => isGuestbookCommentVisibleToPublic(record.data))
    .sort((left, right) => time(right) - time(left) || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0));
  const cursor = request.cursor ? decodeCommentCursor(request.cursor) : null;
  const after = cursor ? sorted.filter(record => {
    const cursorTime = cursor.seconds * 1000 + cursor.nanoseconds / 1e6;
    return time(record) < cursorTime || (time(record) === cursorTime && record.id < cursor.id);
  }) : sorted;
  const comments = after.slice(0, request.limit);
  const hasMore = after.length > request.limit;
  const last = comments.at(-1);
  const milliseconds = last ? time(last) : 0;
  return { comments, hasMore, nextCursor: hasMore && last ? encodeCommentCursor({
    mode: 'legacy', id: last.id, seconds: Math.floor(milliseconds / 1000), nanoseconds: ((milliseconds % 1000 + 1000) % 1000) * 1e6,
  }) : null };
}
