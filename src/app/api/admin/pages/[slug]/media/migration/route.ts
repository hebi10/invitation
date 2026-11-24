import { NextResponse } from 'next/server';
import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { MediaAssetError } from '@/server/mediaAssetService';
import { getServerMediaMigrationPreflight } from '@/server/mediaMigrationPreflightService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    await verifyAdminRequest(request);
    const { slug } = await context.params;
    return NextResponse.json(await getServerMediaMigrationPreflight(slug), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminApiAuthError || error instanceof MediaAssetError) {
      const response = toSafeHttpErrorResponse(error);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    return NextResponse.json({ error: '이미지 이관 사전 점검에 실패했습니다.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
