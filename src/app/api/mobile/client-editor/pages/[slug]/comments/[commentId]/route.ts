import { NextResponse } from 'next/server';

import { authorizeMobileClientEditorRequest } from '@/server/clientEditorMobileApi';
import { getServerFirestore } from '@/server/firebaseAdmin';

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

  const session = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const db = getServerFirestore();
  if (!db) {
    return NextResponse.json(
      { error: 'Server Firestore is not available.' },
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
      { error: 'Comment was not found.' },
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
      { error: 'Comment page does not match the requested page.' },
      { status: 400 }
    );
  }

  try {
    await commentRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[mobile/client-editor/comments] failed to delete comment', error);
    return NextResponse.json(
      { error: 'Failed to delete comment.' },
      { status: 500 }
    );
  }
}
