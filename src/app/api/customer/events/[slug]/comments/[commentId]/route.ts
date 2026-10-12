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
import { scheduleDeleteCustomerEventGuestbookComment, updateCustomerEventGuestbookCommentStatus } from '@/server/customerEventsService';
import { CustomerEventClaimError } from '@/server/customerEventClaimPolicy';

export async function PATCH(request: Request, context: { params: Promise<{ slug: string; commentId: string }> }) {
  try {
    const ownerUid = await verifyCustomerUid(request, { requireVerified: true });
    const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
    if (body?.action !== 'hide' && body?.action !== 'restore') {
      return NextResponse.json({ error: '숨김 또는 복구 작업을 선택해 주세요.' }, { status: 400 });
    }
    const { slug, commentId } = await context.params;
    await updateCustomerEventGuestbookCommentStatus(ownerUid, slug, commentId, body.action);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CustomerApiAuthError || error instanceof CustomerEventClaimError) return toSafeHttpErrorResponse(error);
    const message = getInternalErrorReason(error);
    const status = message === '로그인한 계정에 연결된 청첩장만 관리할 수 있습니다.' ? 403
      : message === '변경할 방명록을 찾을 수 없습니다.' ? 404 : 500;
    return NextResponse.json({ error: status >= 500 ? GENERIC_SERVER_ERROR_MESSAGE : message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request, { requireVerified: true });
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
    if (error instanceof CustomerApiAuthError || error instanceof CustomerEventClaimError) {
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
