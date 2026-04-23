import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { listAdminCustomerAccountsSnapshot } from '@/server/adminCustomerAccountsService';

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const snapshot = await listAdminCustomerAccountsSnapshot();

    return NextResponse.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[api/admin/customers/accounts] failed to list customer accounts', error);
    return NextResponse.json(
      { error: '고객 계정 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
