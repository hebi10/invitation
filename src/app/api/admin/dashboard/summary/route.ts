import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { getAdminDashboardSummarySnapshot } from '@/server/adminDashboardSummaryService';

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const summary = await getAdminDashboardSummarySnapshot();

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[api/admin/dashboard/summary] failed to load summary', error);
    return NextResponse.json(
      { error: '관리자 요약을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
