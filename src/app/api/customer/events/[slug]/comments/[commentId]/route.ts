import { NextResponse } from 'next/server';

import {
  CustomerApiAuthError,
  verifyCustomerUid,
} from '@/server/customerApiAuth';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  getInternalErrorReason,
  toSafeHttpErrorResponse,
} from '@/server/apiErrorResponse';
import { scheduleDeleteCustomerEventGuestbookComment } from '@/server/customerEventsService';

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
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    const message = getInternalErrorReason(error);
    const status =
      message === '로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.' ? 403 : 500;
    const responseMessage = status >= 500 ? GENERIC_SERVER_ERROR_MESSAGE : message;

    console.error('[api/customer/events/comments] failed to delete comment', error);
    return NextResponse.json({ error: responseMessage }, { status });
  }
}
