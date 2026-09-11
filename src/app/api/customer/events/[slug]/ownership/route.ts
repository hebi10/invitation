import { NextResponse } from 'next/server';

import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  CustomerApiAuthError,
  verifyCustomerUid,
} from '@/server/customerApiAuth';
import {
  getCustomerEventOwnershipSnapshot,
} from '@/server/customerEventsService';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    const { slug } = await context.params;
    const snapshot = await getCustomerEventOwnershipSnapshot(ownerUid, slug);

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/events/ownership] failed to resolve ownership', error);
    return NextResponse.json(
      { error: '청첩장 소유권을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await verifyCustomerUid(request);
    return NextResponse.json(
      { error: '고객 연결은 관리자만 가능합니다. 관리자에게 연결을 요청해 주세요.' },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof CustomerApiAuthError) return toSafeHttpErrorResponse(error);
    return NextResponse.json({ error: '요청을 확인할 수 없습니다.' }, { status: 500 });
  }
}
