import { NextResponse } from 'next/server';

import { getCustomerEditableInvitationPageSnapshot } from '@/server/customerEventsService';
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
    const snapshot = await getCustomerEditableInvitationPageSnapshot(ownerUid, slug);

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    console.error('[api/customer/events/editable] failed to load editable event', error);
    return NextResponse.json(
      { error: '청첩장 편집 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
