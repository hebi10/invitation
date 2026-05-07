import { NextResponse } from 'next/server';

import { AdminApiAuthError, verifyAdminRequest } from '@/server/adminApiAuth';
import {
  EditableImageUploadError,
  readEditableImageUploadFormData,
  saveServerOptimizedEditableImage,
} from '@/server/editableImageUploadService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const ADMIN_IMAGE_UPLOAD_RATE_LIMIT = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    await verifyAdminRequest(request);
    const { slug } = await context.params;
    const pageSlug = slug.trim();

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'admin-image-upload',
      keyParts: [pageSlug],
      ...ADMIN_IMAGE_UPLOAD_RATE_LIMIT,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: '이미지 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const { file, assetKind } = await readEditableImageUploadFormData(request);
    const result = await saveServerOptimizedEditableImage({
      pageSlug,
      file,
      assetKind,
    });

    return NextResponse.json(result, {
      headers: buildRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    if (error instanceof AdminApiAuthError || error instanceof EditableImageUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('[admin/pages/images] failed to upload image', error);
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
