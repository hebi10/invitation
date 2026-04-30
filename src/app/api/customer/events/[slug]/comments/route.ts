import { NextResponse } from 'next/server';

import { GENERIC_SERVER_ERROR_MESSAGE, getInternalErrorReason } from '@/server/apiErrorResponse';
import { listCustomerEventGuestbookComments } from '@/server/customerEventsService';
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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    if (!ownerUid) {
      return NextResponse.json(
        { error: '로그인 토큰이 없습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    const { slug } = await context.params;
    const comments = await listCustomerEventGuestbookComments(ownerUid, slug);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    const message = getInternalErrorReason(error);
    const status =
      message === '로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.' ? 403 : 500;
    const responseMessage = status >= 500 ? GENERIC_SERVER_ERROR_MESSAGE : message;

    console.error('[api/customer/events/comments] failed to load comments', error);
    return NextResponse.json({ error: responseMessage }, { status });
  }
}
