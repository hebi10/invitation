import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  buildGuestbookCommentStatusPatch,
  isGuestbookCommentPendingPurge,
} from '@/lib/guestbookComments';
import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';
import { firestoreEventCommentRepository } from '@/server/repositories/eventCommentRepository';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';
import {
  isWebClientEditorAdminOnly,
  WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE,
} from '@/server/webClientEditorPolicy';

const CLIENT_EDITOR_COMMENT_DELETE_RATE_LIMIT = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
} as const;

async function authorizePageSession(pageSlug: string) {
  const cookieStore = await cookies();
  return getAuthorizedClientEditorSession(
    pageSlug,
    cookieStore.get(CLIENT_EDITOR_SESSION_COOKIE)?.value
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  if (isWebClientEditorAdminOnly()) {
    return NextResponse.json(
      { error: WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE },
      { status: 403 }
    );
  }

  const { slug, commentId } = await context.params;
  const pageSlug = slug.trim();
  const normalizedCommentId = commentId.trim();

  if (!pageSlug || !normalizedCommentId) {
    return NextResponse.json(
      { error: '삭제할 방명록 정보를 찾지 못했습니다.' },
      { status: 400 }
    );
  }

  const session = await authorizePageSession(pageSlug);
  if (!session) {
    return NextResponse.json(
      { error: '방명록을 관리할 권한이 없습니다. 다시 로그인해 주세요.' },
      { status: 401 }
    );
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'client-editor-comment-delete',
    keyParts: [pageSlug],
    ...CLIENT_EDITOR_COMMENT_DELETE_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: '방명록 삭제 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  if (!firestoreEventCommentRepository.isAvailable()) {
    return NextResponse.json(
      { error: '방명록 저장소를 확인하지 못했습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  const commentRecord = await firestoreEventCommentRepository.findByPageSlugAndId(
    pageSlug,
    normalizedCommentId
  );
  if (!commentRecord) {
    return NextResponse.json(
      { error: '삭제할 방명록을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const commentData = commentRecord.data;
  if (
    typeof commentData.pageSlug === 'string' &&
    commentData.pageSlug.trim() &&
    commentData.pageSlug.trim() !== pageSlug
  ) {
    return NextResponse.json(
      { error: '방명록과 페이지 정보가 일치하지 않습니다.' },
      { status: 400 }
    );
  }

  if (isGuestbookCommentPendingPurge(commentData)) {
    await firestoreEventCommentRepository.deleteByPageSlugAndId(
      pageSlug,
      normalizedCommentId
    ).catch(() => null);
    return NextResponse.json(
      { error: '삭제할 방명록을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  try {
    await firestoreEventCommentRepository.updateByPageSlugAndId(pageSlug, normalizedCommentId, {
      ...buildGuestbookCommentStatusPatch('scheduleDelete', new Date()),
    });

    return NextResponse.json(
      { success: true },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[client-editor/comments] failed to schedule comment delete', error);
    return NextResponse.json(
      { error: '방명록을 삭제 예정 상태로 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
