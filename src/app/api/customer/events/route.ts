import { NextResponse } from 'next/server';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { CustomerApiAuthError, verifyCustomerRequest } from '@/server/customerApiAuth';
import { listCustomerOwnedEventSummaries } from '@/server/customerEventsService';

export async function GET(request: Request) {
  try {
    const customer = await verifyCustomerRequest(request);
    const events = await listCustomerOwnedEventSummaries(customer.uid);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/events] failed to list owned events', error);
    return NextResponse.json(
      { error: '내 청첩장 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await verifyCustomerRequest(request);
    return NextResponse.json(
      { error: '초대장 생성은 관리자만 가능합니다. 관리자에게 생성을 요청해 주세요.' },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof CustomerApiAuthError) return toSafeHttpErrorResponse(error);
    return NextResponse.json({ error: '요청을 확인할 수 없습니다.' }, { status: 500 });
  }
}
