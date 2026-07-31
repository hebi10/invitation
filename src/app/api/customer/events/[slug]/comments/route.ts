import { NextResponse } from 'next/server';

import {
  GENERIC_SERVER_ERROR_MESSAGE,
  getInternalErrorReason,
  toSafeHttpErrorResponse,
} from '@/server/apiErrorResponse';
import {
  CustomerApiAuthError,
  verifyCustomerUid,
} from '@/server/customerApiAuth';
import { listCustomerEventGuestbookComments } from '@/server/customerEventsService';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    const { slug } = await context.params;
    const comments = await listCustomerEventGuestbookComments(ownerUid, slug);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    const message = getInternalErrorReason(error);
    const status =
      message === '로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.' ? 403 : 500;
    const responseMessage = status >= 500 ? GENERIC_SERVER_ERROR_MESSAGE : message;

    console.error('[api/customer/events/comments] failed to load comments', error);
    return NextResponse.json({ error: responseMessage }, { status });
  }
}
