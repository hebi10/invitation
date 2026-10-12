import { NextResponse } from 'next/server';

import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import { deleteServerMediaAsset, getServerMediaUsageReferences, MediaAssetError } from '@/server/mediaAssetService';

type RouteContext = { params: Promise<{ slug: string }> };

function handleMediaError(error: unknown) {
  if (error instanceof AdminApiAuthError || error instanceof MediaAssetError) return toSafeHttpErrorResponse(error);
  console.error('[admin/pages/media] failed to manage media', error);
  return NextResponse.json({ error: '이미지 사용 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await verifyAdminRequest(request);
    const { slug } = await context.params;
    return NextResponse.json({ references: await getServerMediaUsageReferences(slug) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return handleMediaError(error); }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await verifyAdminRequest(request);
    const { slug } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const path = body && typeof body === 'object' && 'path' in body ? body.path : null;
    if (typeof path !== 'string') throw new MediaAssetError(400, '삭제할 이미지 경로가 필요합니다.');
    return NextResponse.json(await deleteServerMediaAsset(slug, path));
  } catch (error) { return handleMediaError(error); }
}
