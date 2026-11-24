import { NextResponse } from 'next/server';

import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { getServerMediaAccessAudit } from '@/server/mediaAccessAuditService';
import { MediaAssetError } from '@/server/mediaAssetService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    await verifyAdminRequest(request);
    const { slug } = await context.params;
    return NextResponse.json(await getServerMediaAccessAudit(slug), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminApiAuthError || error instanceof MediaAssetError) return toSafeHttpErrorResponse(error);
    // Never log raw Storage metadata or token-bearing URLs.
    return NextResponse.json({ error: '이미지 접근 권한을 점검하지 못했습니다.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
