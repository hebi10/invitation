import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';
import { getServerFirestore } from '@/server/firebaseAdmin';

async function authorizePageSession(pageSlug: string) {
  const cookieStore = await cookies();
  return getAuthorizedClientEditorSession(
    pageSlug,
    cookieStore.get(CLIENT_EDITOR_SESSION_COOKIE)?.value
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  const { slug, commentId } = await context.params;
  const pageSlug = slug.trim();
  const normalizedCommentId = commentId.trim();

  if (!pageSlug || !normalizedCommentId) {
    return NextResponse.json(
      { error: '삭제할 댓글 정보를 확인할 수 없습니다.' },
      { status: 400 }
    );
  }

  const session = await authorizePageSession(pageSlug);
  if (!session) {
    return NextResponse.json(
      { error: '댓글 삭제 권한이 없습니다. 다시 로그인해 주세요.' },
      { status: 401 }
    );
  }

  const db = getServerFirestore();
  if (!db) {
    return NextResponse.json(
      { error: '댓글 저장소에 연결할 수 없습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  const commentRef = db
    .collection('guestbooks')
    .doc(pageSlug)
    .collection('comments')
    .doc(normalizedCommentId);

  const commentSnapshot = await commentRef.get();
  if (!commentSnapshot.exists) {
    return NextResponse.json(
      { error: '삭제할 댓글을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  const commentData = commentSnapshot.data() ?? {};
  if (
    typeof commentData.pageSlug === 'string' &&
    commentData.pageSlug.trim() &&
    commentData.pageSlug.trim() !== pageSlug
  ) {
    return NextResponse.json(
      { error: '댓글과 페이지 정보가 일치하지 않습니다.' },
      { status: 400 }
    );
  }

  try {
    await commentRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[client-editor/comments] failed to delete comment', error);
    return NextResponse.json(
      { error: '댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
