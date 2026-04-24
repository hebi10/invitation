import {
  commentRepository,
  type Comment,
  type CommentInput,
} from '@/services/repositories/commentRepository';

import { getCurrentFirebaseIdToken } from './adminAuth';

export interface CommentSummary {
  totalCount: number;
  recentCount: number;
}

const DEFAULT_RECENT_COMMENT_DAYS = 7;
const mockComments = new Map<string, Comment[]>();

type AdminCommentsApiResponse = {
  success?: boolean;
  comments?: Array<Record<string, unknown>>;
  error?: string;
};

export type { Comment, CommentInput };

function sortComments(comments: Comment[]) {
  return [...comments].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}

function buildRecentThreshold(recentDays: number) {
  return new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
}

function readCommentDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(0);
}

function normalizeAdminComment(input: Record<string, unknown>): Comment | null {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const pageSlug = typeof input.pageSlug === 'string' ? input.pageSlug.trim() : '';
  if (!id || !pageSlug) {
    return null;
  }

  const comment: Comment = {
    id,
    author: typeof input.author === 'string' ? input.author : '',
    message: typeof input.message === 'string' ? input.message : '',
    createdAt: readCommentDate(input.createdAt),
    pageSlug,
  };

  if (typeof input.collectionName === 'string' && input.collectionName.trim()) {
    comment.collectionName = input.collectionName.trim();
  }

  return comment;
}

async function getAdminAuthHeaders() {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    throw new Error('관리자 로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.');
  }

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

async function fetchAdminComments() {
  const response = await fetch('/api/admin/comments', {
    method: 'GET',
    headers: await getAdminAuthHeaders(),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as
    | AdminCommentsApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string' && payload.error.trim()
        ? payload.error
        : '방명록 목록을 불러오지 못했습니다.'
    );
  }

  return Array.isArray(payload?.comments)
    ? payload.comments
        .map((comment) => normalizeAdminComment(comment))
        .filter((comment): comment is Comment => comment !== null)
    : [];
}

export async function addComment(commentData: CommentInput): Promise<void> {
  const payload = {
    author: commentData.author.trim(),
    message: commentData.message.trim(),
    pageSlug: commentData.pageSlug.trim(),
  };

  if (!payload.author || !payload.message || !payload.pageSlug) {
    throw new Error('Required comment fields are missing.');
  }

  if (!commentRepository.isAvailable()) {
    const nextComment: Comment = {
      id: `mock-${Date.now()}`,
      ...payload,
      createdAt: new Date(),
      collectionName: 'mock-comments',
    };
    const existing = mockComments.get(payload.pageSlug) ?? [];
    mockComments.set(payload.pageSlug, [nextComment, ...existing]);
    return;
  }

  await commentRepository.create(payload);
}

export async function getComments(pageSlug: string): Promise<Comment[]> {
  if (!commentRepository.isAvailable()) {
    return sortComments([...(mockComments.get(pageSlug) ?? [])]);
  }

  return sortComments(await commentRepository.list(pageSlug));
}

export async function deleteComment(
  commentId: string,
  collectionName?: string
): Promise<void> {
  if (!commentRepository.isAvailable()) {
    for (const [pageSlug, comments] of mockComments.entries()) {
      mockComments.set(
        pageSlug,
        comments.filter((comment) => comment.id !== commentId)
      );
    }
    return;
  }

  if (!collectionName?.trim()) {
    throw new Error('Comment collection path is required.');
  }

  await commentRepository.scheduleDelete(commentId, collectionName);
}

export async function getAllComments(): Promise<Comment[]> {
  if (!commentRepository.isAvailable()) {
    return sortComments([...mockComments.values()].flat());
  }

  if (typeof window !== 'undefined') {
    return sortComments(await fetchAdminComments());
  }

  return sortComments(await commentRepository.list());
}

export async function getCommentSummary(
  recentDays = DEFAULT_RECENT_COMMENT_DAYS
): Promise<CommentSummary> {
  const threshold = buildRecentThreshold(recentDays);
  const comments = await getAllComments();

  return {
    totalCount: comments.length,
    recentCount: comments.filter(
      (comment) => comment.createdAt.getTime() >= threshold.getTime()
    ).length,
  };
}
