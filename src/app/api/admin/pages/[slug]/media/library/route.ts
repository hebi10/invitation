import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminApiAuthError } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { MediaAssetError } from '@/server/mediaAssetService';
import { getAdminMediaLibrary } from '@/server/adminMediaLibraryService';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    await verifyAdminRequest(request);
    const { slug } = await context.params;
    return NextResponse.json(await getAdminMediaLibrary(slug), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminApiAuthError || error instanceof MediaAssetError) {
      const response = toSafeHttpErrorResponse(error);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    return NextResponse.json({ error: '이미지 목록을 확인하지 못했습니다.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
