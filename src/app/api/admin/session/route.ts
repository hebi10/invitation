import { NextResponse } from 'next/server';

import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';

export async function GET(request: Request) {
  try {
    const decodedToken = await verifyAdminRequest(request);

    return NextResponse.json({
      success: true,
      isAdmin: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email ?? null,
      },
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[api/admin/session] failed to verify admin session', error);
    return NextResponse.json(
      { error: '관리자 로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
