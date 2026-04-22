import {
  commentRepository,
  type Comment,
  type CommentInput,
} from '@/services/repositories/commentRepository';

export interface CommentSummary {
  totalCount: number;
  recentCount: number;
}

const DEFAULT_RECENT_COMMENT_DAYS = 7;
const mockComments = new Map<string, Comment[]>();

export type { Comment, CommentInput };

function sortComments(comments: Comment[]) {
  return [...comments].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}

function buildRecentThreshold(recentDays: number) {
  return new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
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
