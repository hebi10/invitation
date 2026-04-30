import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { GENERIC_SERVER_ERROR_MESSAGE, toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  assignAdminCustomerEventOwnership,
  clearAdminCustomerEventOwnership,
} from '@/server/adminCustomerAccountsService';

type OwnershipRequestBody = {
  action?: unknown;
  uid?: unknown;
  pageSlug?: unknown;
};

export async function POST(request: Request) {
  try {
    await verifyAdminRequest(request);

    const body = (await request.json().catch(() => null)) as OwnershipRequestBody | null;
    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
    const pageSlug = typeof body?.pageSlug === 'string' ? body.pageSlug.trim() : '';

    if (!pageSlug) {
      return NextResponse.json(
        { error: '청첩장 주소를 먼저 선택해 주세요.' },
        { status: 400 }
      );
    }

    if (action === 'assign') {
      if (!uid) {
        return NextResponse.json(
          { error: '연결할 고객 계정을 먼저 선택해 주세요.' },
          { status: 400 }
        );
      }

      const resolvedEvent = await assignAdminCustomerEventOwnership({
        uid,
        pageSlug,
      });

      return NextResponse.json({
        success: true,
        action,
        eventId: resolvedEvent.summary.eventId,
        slug: resolvedEvent.summary.slug,
        ownerUid: resolvedEvent.summary.ownerUid,
      });
    }

    if (action === 'clear') {
      const resolvedEvent = await clearAdminCustomerEventOwnership({
        pageSlug,
      });

      return NextResponse.json({
        success: true,
        action,
        eventId: resolvedEvent.summary.eventId,
        slug: resolvedEvent.summary.slug,
        ownerUid: resolvedEvent.summary.ownerUid,
      });
    }

    return NextResponse.json(
      { error: '지원하지 않는 소유권 변경 요청입니다.' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/admin/customers/ownership] failed to update ownership', error);
    return NextResponse.json({ error: GENERIC_SERVER_ERROR_MESSAGE }, { status: 500 });
  }
}
