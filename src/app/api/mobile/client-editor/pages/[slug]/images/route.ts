import { NextResponse } from 'next/server';

import type { EditableImageAssetKind } from '@/lib/imageUploadPolicy';
import { toSafeHttpErrorResponse } from '@/server/apiErrorResponse';
import {
  authorizeMobileClientEditorRequest,
  buildMissingMobileClientEditorPermissionError,
  hasMobileClientEditorPermission,
} from '@/server/clientEditorMobileApi';
import {
  EditableImageUploadError,
  readEditableImageAssetKind,
  saveServerOptimizedEditableImage,
} from '@/server/editableImageUploadService';
import { getServerStorageBucket } from '@/server/firebaseAdmin';
import {
  applyScopedRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const MAX_IMAGE_CLEANUP_PATHS = 40;
const MOBILE_CLIENT_EDITOR_IMAGE_UPLOAD_RATE_LIMIT = {
  limit: 10,
  windowMs: 5 * 60 * 1000,
} as const;
const MOBILE_CLIENT_EDITOR_IMAGE_CLEANUP_RATE_LIMIT = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
} as const;

type MobileBase64UploadBody = {
  assetKind?: string;
  fileName?: string;
  mimeType?: string;
  base64?: string;
  uploadSessionId?: string;
};
type MobileImageCleanupBody = {
  paths?: unknown;
};
type ResolvedUploadPayload = {
  assetKind: EditableImageAssetKind;
  file: File;
  uploadSessionId: string;
};

function readAssetKind(value: unknown): EditableImageAssetKind | null {
  return typeof value === 'string' ? readEditableImageAssetKind(value) : null;
}

function sanitizeUploadSessionId(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  return /^[a-z0-9-]{8,80}$/.test(normalized) ? normalized : '';
}

function normalizeBase64Payload(value: string) {
  const trimmed = value.trim();
  const markerIndex = trimmed.indexOf('base64,');
  return markerIndex >= 0 ? trimmed.slice(markerIndex + 'base64,'.length) : trimmed;
}

function normalizeCleanupPath(value: unknown, pageSlug: string) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.includes('\\')) {
    return null;
  }

  return normalized.startsWith(`wedding-images/${pageSlug}/`) ? normalized : null;
}

async function readCleanupPaths(request: Request, pageSlug: string) {
  const body = (await request.json().catch(() => null)) as MobileImageCleanupBody | null;
  if (!Array.isArray(body?.paths) || body.paths.length === 0) {
    return { error: 'Image cleanup paths are required.' };
  }

  if (body.paths.length > MAX_IMAGE_CLEANUP_PATHS) {
    return { error: 'Too many image cleanup paths were requested.' };
  }

  const normalizedEntries = body.paths.map((path) => normalizeCleanupPath(path, pageSlug));

  if (normalizedEntries.some((path) => path === null)) {
    return {
      error: body.paths.some((path) => typeof path !== 'string')
        ? 'Image cleanup path is invalid.'
        : 'Image cleanup path does not belong to the current page.',
    };
  }

  return {
    paths: Array.from(
      new Set(normalizedEntries.filter((path): path is string => path !== null))
    ),
  };
}

async function readUploadPayload(request: Request): Promise<ResolvedUploadPayload | null> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as MobileBase64UploadBody | null;
    const assetKind = readAssetKind(body?.assetKind ?? null);
    const normalizedBase64 =
      typeof body?.base64 === 'string' ? normalizeBase64Payload(body.base64) : '';
    const fileName =
      typeof body?.fileName === 'string' && body.fileName.trim()
        ? body.fileName.trim()
        : 'image.jpg';
    const mimeType =
      typeof body?.mimeType === 'string' && body.mimeType.trim()
        ? body.mimeType.trim()
        : 'image/jpeg';
    const uploadSessionId = sanitizeUploadSessionId(body?.uploadSessionId ?? null);

    if (!assetKind || !normalizedBase64) {
      return null;
    }

    const buffer = Buffer.from(normalizedBase64, 'base64');
    if (!buffer.length) {
      return null;
    }

    return {
      assetKind,
      file: new File([buffer], fileName, { type: mimeType }),
      uploadSessionId,
    };
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const assetKind = readAssetKind(formData?.get('assetKind') ?? null);
  const uploadSessionId = sanitizeUploadSessionId(
    formData?.get('uploadSessionId') ?? null
  );

  if (!(file instanceof File) || !assetKind) {
    return null;
  }

  return {
    assetKind,
    file,
    uploadSessionId,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json(
      { error: '이미지 업로드 권한이 없습니다. 다시 로그인해 주세요.' },
      { status: 401 }
    );
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canUploadImages')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canUploadImages') },
      { status: 403 }
    );
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-client-editor-image-upload',
    keyParts: [pageSlug],
    ...MOBILE_CLIENT_EDITOR_IMAGE_UPLOAD_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many image upload requests. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const uploadPayload = await readUploadPayload(request);
  if (!uploadPayload) {
    return NextResponse.json(
      { error: '업로드할 이미지와 자산 종류를 함께 보내 주세요.' },
      { status: 400 }
    );
  }

  try {
    const result = await saveServerOptimizedEditableImage({
      pageSlug,
      file: uploadPayload.file,
      assetKind: uploadPayload.assetKind,
      uploadSessionId: uploadPayload.uploadSessionId || 'legacy-mobile-upload',
    });

    return NextResponse.json(result, {
      headers: buildRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    if (error instanceof EditableImageUploadError) {
      return toSafeHttpErrorResponse(error);
    }

    console.error('[mobile/client-editor/images] failed to upload image', error);
    return NextResponse.json(
      { error: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const pageSlug = slug.trim();

  const access = await authorizeMobileClientEditorRequest(request, pageSlug);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canUploadImages')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canUploadImages') },
      { status: 403 }
    );
  }

  const rateLimitResult = await applyScopedRateLimit({
    request,
    scope: 'mobile-client-editor-image-cleanup',
    keyParts: [pageSlug],
    ...MOBILE_CLIENT_EDITOR_IMAGE_CLEANUP_RATE_LIMIT,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many image cleanup requests. Please try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const bucket = getServerStorageBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: 'Image storage is not available.' },
      { status: 503 }
    );
  }

  const cleanupPayload = await readCleanupPaths(request, pageSlug);
  if ('error' in cleanupPayload) {
    return NextResponse.json({ error: cleanupPayload.error }, { status: 400 });
  }

  try {
    await Promise.all(
      cleanupPayload.paths.map((path) =>
        bucket.file(path).delete({ ignoreNotFound: true })
      )
    );

    return NextResponse.json(
      {
        success: true,
        deletedPaths: cleanupPayload.paths,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error('[mobile/client-editor/images] failed to clean up image', error);
    return NextResponse.json(
      { error: 'Failed to clean up uploaded images.' },
      { status: 500 }
    );
  }
}
