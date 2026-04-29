import { NextResponse } from 'next/server';

import { scheduleDeleteCustomerEventGuestbookComment } from '@/server/customerEventsService';
import { getServerAuth } from '@/server/firebaseAdmin';

async function verifyCustomerUid(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return null;
  }

  const serverAuth = getServerAuth();
  if (!serverAuth) {
    throw new Error('Firebase Admin Auth를 초기화하지 못했습니다.');
  }

  const decodedToken = await serverAuth.verifyIdToken(idToken);
  return decodedToken.uid;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    if (!ownerUid) {
      return NextResponse.json(
        { error: '로그인 토큰이 없습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    const { slug, commentId } = await context.params;
    await scheduleDeleteCustomerEventGuestbookComment(ownerUid, slug, commentId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '방명록을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    const status =
      message === '로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.' ? 403 : 500;

    console.error('[api/customer/events/comments] failed to delete comment', error);
    return NextResponse.json({ error: message }, { status });
  }
}
