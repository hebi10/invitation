import { NextResponse } from 'next/server';

import { CustomerApiAuthError, verifyCustomerUid } from '@/server/customerApiAuth';
import { getCustomerEventOwnershipSnapshot } from '@/server/customerEventsService';
import {
  EditableImageUploadError,
  readEditableImageUploadFormData,
  saveServerOptimizedEditableImage,
} from '@/server/editableImageUploadService';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const CUSTOMER_EVENT_IMAGE_UPLOAD_RATE_LIMIT = {
  limit: 12,
  windowMs: 5 * 60 * 1000,
} as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const ownerUid = await verifyCustomerUid(request);
    const { slug } = await context.params;
    const pageSlug = slug.trim();

    const ownership = await getCustomerEventOwnershipSnapshot(ownerUid, pageSlug);
    if (ownership.status !== 'owner') {
      return NextResponse.json(
        { error: '로그인한 계정이 소유한 청첩장만 이미지를 업로드할 수 있습니다.' },
        { status: 403 }
      );
    }

    const rateLimitResult = await applyScopedRateLimit({
      request,
      scope: 'customer-event-image-upload',
      keyParts: [ownerUid, pageSlug],
      ...CUSTOMER_EVENT_IMAGE_UPLOAD_RATE_LIMIT,
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
    if (error instanceof CustomerApiAuthError || error instanceof EditableImageUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('[customer/events/images] failed to upload image', error);
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
