import { NextResponse } from 'next/server';

import { listCustomerOwnedEventSummaries } from '@/server/customerEventsService';
import { getServerAuth } from '@/server/firebaseAdmin';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!idToken) {
      return NextResponse.json(
        { error: '로그인 토큰이 없습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    const serverAuth = getServerAuth();
    if (!serverAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin Auth를 초기화하지 못했습니다.' },
        { status: 500 }
      );
    }

    const decodedToken = await serverAuth.verifyIdToken(idToken).catch(() => null);
    if (!decodedToken) {
      return NextResponse.json(
        { error: '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    const events = await listCustomerOwnedEventSummaries(decodedToken.uid);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('[api/customer/events] failed to list owned events', error);
    return NextResponse.json(
      { error: '내 청첩장 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
