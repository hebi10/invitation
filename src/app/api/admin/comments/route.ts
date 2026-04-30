import { NextResponse } from 'next/server';

import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { listAdminComments } from '@/server/adminCommentsService';

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const comments = await listAdminComments();

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/admin/comments] failed to list comments', error);
    return NextResponse.json(
      { error: '방명록 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
