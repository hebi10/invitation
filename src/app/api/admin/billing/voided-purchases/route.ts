import { NextResponse } from 'next/server';

import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { getAdminVoidedPurchaseReview } from '@/server/adminVoidedPurchaseReviewService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const review = await getAdminVoidedPurchaseReview();
    return NextResponse.json({ success: true, ...review }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminApiAuthError) return toSafeHttpErrorResponse(error);
    // Never log a raw Play API response, credentials or purchase token.
    return NextResponse.json(
      { error: '환불 거래를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
