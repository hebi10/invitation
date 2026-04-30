import { NextResponse } from 'next/server';

import { GENERIC_SERVER_ERROR_MESSAGE } from '@/server/apiErrorResponse';
import { getCustomerWalletSummary } from '@/server/customerWalletServerService';
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
        { error: GENERIC_SERVER_ERROR_MESSAGE },
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

    const wallet = await getCustomerWalletSummary(decodedToken.uid);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error('[api/customer/wallet] failed to load customer wallet', error);
    return NextResponse.json(
      { error: '보유 이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
