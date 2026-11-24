import { NextResponse } from 'next/server';
import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { getAdminRefundAccessState, reviewRefundAccess } from '@/server/refundAccessService';
import { RefundAccessError, validRefundTransactionId, validRefundReleaseReason } from '@/server/refundAccessPolicy';
import { applyScopedRateLimit, buildRateLimitHeaders } from '@/server/requestRateLimit';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
function handleError(error: unknown) {
  const status = error instanceof AdminApiAuthError || error instanceof RefundAccessError ? error.status : 503;
  return NextResponse.json({ error: status >= 500 ? '환불 검토를 처리하지 못했습니다.' : (error as Error).message }, { status, headers: noStore });
}
export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    return NextResponse.json(await getAdminRefundAccessState(), { headers: noStore });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    const limit = await applyScopedRateLimit({ request, scope: 'admin-refund-access-mutation', keyParts: [admin.uid], limit: 10, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429, headers: { ...buildRateLimitHeaders(limit), ...noStore } });
    const body = await request.json().catch(() => null) as { action?: unknown; transactionIdentifier?: unknown; confirmed?: unknown; releaseReason?: unknown } | null;
    if (!body || body.confirmed !== true || !validRefundTransactionId(body.transactionIdentifier) ||
        (body.action !== 'hold' && body.action !== 'release') ||
        (body.action === 'release' && !validRefundReleaseReason(body.releaseReason))) throw new RefundAccessError(400, '거래와 관리자 확인을 검토해 주세요.');
    return NextResponse.json({ success: true, ...await reviewRefundAccess({
      action: body.action, id: body.transactionIdentifier, adminUid: admin.uid,
      releaseReason: validRefundReleaseReason(body.releaseReason) ? body.releaseReason : undefined,
    }) }, { headers: noStore });
  } catch (error) { return handleError(error); }
}
