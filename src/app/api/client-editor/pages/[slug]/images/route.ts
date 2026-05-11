import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { CLIENT_EDITOR_SESSION_COOKIE } from '@/server/clientEditorSession';
import { getAuthorizedClientEditorSession } from '@/server/clientEditorSessionAuth';
import {
  EditableImageUploadError,
  readEditableImageUploadFormData,
  saveServerOptimizedEditableImage,
} from '@/server/editableImageUploadService';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';
import {
  isWebClientEditorAdminOnly,
  WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE,
} from '@/server/webClientEditorPolicy';

const CLIENT_EDITOR_IMAGE_UPLOAD_RATE_LIMIT = {
  limit: 10,
  windowMs: 5 * 60 * 1000,
} as const;

async function authorizePageSession(pageSlug: string) {
  const cookieStore = await cookies();
  return getAuthorizedClientEditorSession(
    pageSlug,
    cookieStore.get(CLIENT_EDITOR_SESSION_COOKIE)?.value
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (isWebClientEditorAdminOnly()) {
    return NextResponse.json(
      { error: WEB_CLIENT_EDITOR_ADMIN_ONLY_MESSAGE },
      { status: 403 }
    );
  }

  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const session = await authorizePageSession(pageSlug);
  if (!session) {
    return NextResponse.json(
      { error: '이미지 업로드 권한이 없습니다. 다시 로그인해 주세요.' },
      { status: 401 }
    );
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'client-editor-image-upload',
    keyParts: [pageSlug],
    ...CLIENT_EDITOR_IMAGE_UPLOAD_RATE_LIMIT,
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

  try {
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
    if (error instanceof EditableImageUploadError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[client-editor/images] failed to upload image', error);
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
