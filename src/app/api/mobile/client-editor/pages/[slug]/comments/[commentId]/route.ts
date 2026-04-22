import { NextResponse } from 'next/server';

import {
  buildGuestbookCommentStatusPatch,
  isGuestbookCommentAction,
  isGuestbookCommentPendingPurge,
  type GuestbookCommentAction,
} from '@/lib/guestbookComments';
import {
  authorizeMobileClientEditorRequest,
  buildMissingMobileClientEditorPermissionError,
  buildServerGuestbookCommentSummary,
  hasMobileClientEditorPermission,
} from '@/server/clientEditorMobileApi';
import { firestoreEventCommentRepository } from '@/server/repositories/eventCommentRepository';
import {
  applyScopedInMemoryRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MOBILE_CLIENT_EDITOR_COMMENT_MUTATION_RATE_LIMIT = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
} as const;

async function authorizeCommentMutation(request: Request, pageSlug: string) {
  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canManageGuestbook')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canManageGuestbook') },
      { status: 403 }
    );
  }

  return access;
}

function applyCommentMutationRateLimit(request: Request, pageSlug: string) {
  return applyScopedInMemoryRateLimit({
    request,
    scope: 'mobile-client-editor-comment-mutation',
    keyParts: [pageSlug],
    ...MOBILE_CLIENT_EDITOR_COMMENT_MUTATION_RATE_LIMIT,
  });
}

async function loadCommentTarget(pageSlug: string, commentId: string) {
  if (!firestoreEventCommentRepository.isAvailable()) {
    return {
      error: NextResponse.json(
        { error: 'Server Firestore is not available.' },
        { status: 503 }
      ),
      commentRef: null,
      commentData: null,
    };
  }

  const commentRecord = await firestoreEventCommentRepository.findByPageSlugAndId(
    pageSlug,
    commentId
  );
  if (!commentRecord) {
    return {
      error: NextResponse.json(
        { error: 'Comment was not found.' },
        { status: 404 }
      ),
      commentRef: null,
      commentData: null,
    };
  }

  const commentData = commentRecord.data;
  if (
    typeof commentData.pageSlug === 'string' &&
    commentData.pageSlug.trim() &&
    commentData.pageSlug.trim() !== pageSlug
  ) {
    return {
      error: NextResponse.json(
        { error: 'Comment page does not match the requested page.' },
        { status: 400 }
      ),
      commentRef: null,
      commentData,
    };
  }

  if (isGuestbookCommentPendingPurge(commentData)) {
    await firestoreEventCommentRepository.deleteByPageSlugAndId(pageSlug, commentId).catch(
      () => null
    );
    return {
      error: NextResponse.json(
        { error: 'Comment was not found.' },
        { status: 404 }
      ),
      commentRef: null,
      commentData,
    };
  }

  return {
    error: null,
    commentRef: commentRecord.id,
    commentData,
  };
}

async function updateCommentStatus(
  pageSlug: string,
  commentId: string,
  action: GuestbookCommentAction
) {
  const target = await loadCommentTarget(pageSlug, commentId);
  if (target.error) {
    return target.error;
  }

  if (!target.commentRef || !target.commentData) {
    return NextResponse.json(
      { error: 'Comment was not found.' },
      { status: 404 }
    );
  }

  const now = new Date();
  const nextStatusPatch = buildGuestbookCommentStatusPatch(action, now);

  try {
    await firestoreEventCommentRepository.updateByPageSlugAndId(pageSlug, commentId, {
      ...nextStatusPatch,
    });
    const nextSummary = buildServerGuestbookCommentSummary(commentId, pageSlug, {
      ...target.commentData,
      ...nextStatusPatch,
    });

    return NextResponse.json({
      success: true,
      comment: nextSummary,
    });
  } catch (error) {
    console.error('[mobile/client-editor/comments] failed to update comment status', error);
    return NextResponse.json(
      { error: 'Failed to update comment status.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  const { slug, commentId } = await context.params;
  const pageSlug = slug.trim();
  const normalizedCommentId = commentId.trim();

  if (!pageSlug || !normalizedCommentId) {
    return NextResponse.json(
      { error: 'Comment target was not specified.' },
      { status: 400 }
    );
  }

  const authorizationResult = await authorizeCommentMutation(request, pageSlug);
  if (authorizationResult instanceof Response) {
    return authorizationResult;
  }

  const rateLimitResult = applyCommentMutationRateLimit(request, pageSlug);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many comment update requests. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const payload = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (payload?.action == null) {
    return NextResponse.json(
      { error: 'Comment action is required.' },
      { status: 400 }
    );
  }

  if (!isGuestbookCommentAction(payload.action)) {
    return NextResponse.json(
      { error: 'Unsupported comment action.' },
      { status: 400 }
    );
  }

  const response = await updateCommentStatus(pageSlug, normalizedCommentId, payload.action);
  response.headers.set(
    'X-RateLimit-Limit',
    String(MOBILE_CLIENT_EDITOR_COMMENT_MUTATION_RATE_LIMIT.limit)
  );
  const rateHeaders = buildRateLimitHeaders(rateLimitResult);
  Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  const { slug, commentId } = await context.params;
  const pageSlug = slug.trim();
  const normalizedCommentId = commentId.trim();

  if (!pageSlug || !normalizedCommentId) {
    return NextResponse.json(
      { error: 'Comment target was not specified.' },
      { status: 400 }
    );
  }

  const authorizationResult = await authorizeCommentMutation(request, pageSlug);
  if (authorizationResult instanceof Response) {
    return authorizationResult;
  }

  const rateLimitResult = applyCommentMutationRateLimit(request, pageSlug);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many comment update requests. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const response = await updateCommentStatus(
    pageSlug,
    normalizedCommentId,
    'scheduleDelete'
  );
  const rateHeaders = buildRateLimitHeaders(rateLimitResult);
  Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}
