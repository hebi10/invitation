import { NextResponse } from 'next/server';

import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  CustomerApiAuthError,
  verifyCustomerUid,
} from '@/server/customerApiAuth';
import { getCustomerWalletSummary } from '@/server/customerWalletServerService';

export async function GET(request: Request) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    const wallet = await getCustomerWalletSummary(ownerUid);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    if (error instanceof CustomerApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/customer/wallet] failed to load customer wallet', error);
    return NextResponse.json(
      { error: '보유 이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
