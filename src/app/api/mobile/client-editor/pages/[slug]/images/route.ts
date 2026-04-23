import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  type EditableImageAssetKind,
  validateEditableImageBatch,
} from '@/lib/imageUploadPolicy';
import {
  authorizeMobileClientEditorRequest,
  buildMissingMobileClientEditorPermissionError,
  hasMobileClientEditorPermission,
} from '@/server/clientEditorMobileApi';
import { getServerStorageBucket } from '@/server/firebaseAdmin';
import {
  applyScopedInMemoryRateLimit,
  buildRateLimitHeaders,
} from '@/server/requestRateLimit';

const ALLOWED_ASSET_KINDS: EditableImageAssetKind[] = [
  'cover',
  'favicon',
  'gallery',
  'share-preview',
  'kakao-card',
];
const MAX_IMAGE_DIMENSION = 6000;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_IMAGE_CLEANUP_PATHS = 40;
const MIN_IMAGE_DIMENSION = 240;
const MIN_FAVICON_DIMENSION = 48;
const MAX_ASPECT_RATIO_BY_KIND: Record<EditableImageAssetKind, number> = {
  cover: 4,
  gallery: 4,
  favicon: 1.8,
  'share-preview': 4,
  'kakao-card': 4,
};
const MOBILE_CLIENT_EDITOR_IMAGE_UPLOAD_RATE_LIMIT = {
  limit: 10,
  windowMs: 5 * 60 * 1000,
} as const;
const MOBILE_CLIENT_EDITOR_IMAGE_CLEANUP_RATE_LIMIT = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
} as const;

type SniffedImageFormat = 'jpeg' | 'png' | 'webp';
type ImageDimensions = { width: number; height: number };
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
  buffer: Buffer;
  thumbnailFile: File | null;
  thumbnailBuffer: Buffer | null;
  uploadSessionId: string;
};

function sniffImageFormat(buffer: Buffer): SniffedImageFormat | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

function mimeMatchesFormat(mimeType: string, format: SniffedImageFormat) {
  if (!mimeType) {
    return true;
  }

  if (format === 'jpeg') {
    return mimeType === 'image/jpeg';
  }

  if (format === 'png') {
    return mimeType === 'image/png';
  }

  return mimeType === 'image/webp';
}

function contentTypeFromFormat(format: SniffedImageFormat) {
  if (format === 'jpeg') {
    return 'image/jpeg';
  }

  if (format === 'png') {
    return 'image/png';
  }

  return 'image/webp';
}

function readPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0x01) {
      offset += 2;
      continue;
    }

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      return null;
    }

    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function readWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 16) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;
    const chunkEndOffset = chunkDataOffset + chunkSize;

    if (chunkEndOffset > buffer.length) {
      return null;
    }

    if (chunkType === 'VP8X' && chunkSize >= 10) {
      const width =
        1 +
        buffer[chunkDataOffset + 4] +
        (buffer[chunkDataOffset + 5] << 8) +
        (buffer[chunkDataOffset + 6] << 16);
      const height =
        1 +
        buffer[chunkDataOffset + 7] +
        (buffer[chunkDataOffset + 8] << 8) +
        (buffer[chunkDataOffset + 9] << 16);

      return { width, height };
    }

    if (chunkType === 'VP8 ' && chunkSize >= 10) {
      if (
        buffer[chunkDataOffset + 3] === 0x9d &&
        buffer[chunkDataOffset + 4] === 0x01 &&
        buffer[chunkDataOffset + 5] === 0x2a
      ) {
        return {
          width: buffer.readUInt16LE(chunkDataOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(chunkDataOffset + 8) & 0x3fff,
        };
      }
    }

    if (chunkType === 'VP8L' && chunkSize >= 5) {
      const bits = buffer.readUInt32LE(chunkDataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    offset = chunkEndOffset + (chunkSize % 2);
  }

  return null;
}

function readImageDimensions(
  buffer: Buffer,
  format: SniffedImageFormat
): ImageDimensions | null {
  if (format === 'jpeg') {
    return readJpegDimensions(buffer);
  }

  if (format === 'png') {
    return readPngDimensions(buffer);
  }

  return readWebpDimensions(buffer);
}

function validateServerSideImagePayload(
  file: File,
  buffer: Buffer,
  assetKind: EditableImageAssetKind
) {
  const format = sniffImageFormat(buffer);
  if (!format) {
    return {
      error: '지원하지 않는 이미지 데이터입니다. JPG, PNG, WEBP 파일만 업로드할 수 있습니다.',
    };
  }

  if (file.type && !mimeMatchesFormat(file.type, format)) {
    return {
      error: '파일 확장자 또는 MIME 타입이 실제 이미지 데이터와 일치하지 않습니다.',
    };
  }

  const dimensions = readImageDimensions(buffer, format);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return { error: '이미지 해상도를 확인할 수 없습니다. 다른 이미지를 선택해 주세요.' };
  }

  const minDimension = assetKind === 'favicon' ? MIN_FAVICON_DIMENSION : MIN_IMAGE_DIMENSION;

  if (dimensions.width < minDimension || dimensions.height < minDimension) {
    return {
      error:
        assetKind === 'favicon'
          ? `파비콘 이미지는 가로/세로 ${MIN_FAVICON_DIMENSION}px 이상이어야 합니다.`
          : `이미지는 가로/세로 ${MIN_IMAGE_DIMENSION}px 이상이어야 합니다.`,
    };
  }

  if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
    return {
      error: `이미지 해상도는 가로/세로 최대 ${MAX_IMAGE_DIMENSION}px까지만 허용됩니다.`,
    };
  }

  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    return {
      error: '이미지 해상도가 너무 큽니다. 더 작은 이미지를 사용해 주세요.',
    };
  }

  const aspectRatio = Math.max(
    dimensions.width / dimensions.height,
    dimensions.height / dimensions.width
  );
  const maxAspectRatio = MAX_ASPECT_RATIO_BY_KIND[assetKind];

  if (aspectRatio > maxAspectRatio) {
    return {
      error: '이미지 비율이 너무 극단적입니다. 더 균형 잡힌 비율의 이미지를 사용해 주세요.',
    };
  }

  return {
    contentType: contentTypeFromFormat(format),
  };
}

function sanitizeFileNameSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildStoredFileName(fileName: string, assetKind: EditableImageAssetKind) {
  const extensionIndex = fileName.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? sanitizeFileNameSegment(fileName.slice(extensionIndex + 1)) : '';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const prefix = sanitizeFileNameSegment(assetKind) || 'image';

  return extension
    ? `${prefix}-${timestamp}-${randomSuffix}.${extension}`
    : `${prefix}-${timestamp}-${randomSuffix}`;
}

function buildThumbnailFileName(fileName: string) {
  return `thumb-${fileName}`;
}

function readAssetKind(value: unknown): EditableImageAssetKind | null {
  if (typeof value !== 'string') {
    return null;
  }

  return ALLOWED_ASSET_KINDS.includes(value as EditableImageAssetKind)
    ? (value as EditableImageAssetKind)
    : null;
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
  if (!Array.isArray(body?.paths)) {
    return { error: 'Image cleanup paths are required.' };
  }

  if (body.paths.length === 0) {
    return { error: 'Image cleanup paths are required.' };
  }

  if (body.paths.length > MAX_IMAGE_CLEANUP_PATHS) {
    return { error: 'Too many image cleanup paths were requested.' };
  }

  const normalizedEntries = body.paths.map((path) =>
    normalizeCleanupPath(path, pageSlug)
  );

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
      buffer,
      thumbnailFile: null,
      thumbnailBuffer: null,
      uploadSessionId,
    };
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const thumbnailEntry = formData?.get('thumbnail');
  const thumbnailFile = thumbnailEntry instanceof File ? thumbnailEntry : null;
  const assetKind = readAssetKind(formData?.get('assetKind') ?? null);
  const uploadSessionId = sanitizeUploadSessionId(
    formData?.get('uploadSessionId') ?? null
  );

  if (!(file instanceof File) || !assetKind) {
    return null;
  }

  const buffer = await file
    .arrayBuffer()
    .then((arrayBuffer) => Buffer.from(arrayBuffer))
    .catch(() => null);
  const thumbnailBuffer = thumbnailFile
    ? await thumbnailFile
        .arrayBuffer()
        .then((arrayBuffer) => Buffer.from(arrayBuffer))
        .catch(() => null)
    : null;

  if (!buffer) {
    return null;
  }

  return {
    assetKind,
    file,
    buffer,
    thumbnailFile,
    thumbnailBuffer,
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

  const rateLimitResult = applyScopedInMemoryRateLimit({
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

  const bucket = getServerStorageBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: '이미지 저장소가 준비되지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  const uploadPayload = await readUploadPayload(request);
  const file = uploadPayload?.file ?? null;
  const thumbnailFile = uploadPayload?.thumbnailFile ?? null;
  const assetKind = uploadPayload?.assetKind ?? null;

  if (!(file instanceof File) || !assetKind) {
    return NextResponse.json(
      { error: '업로드할 이미지와 자산 종류를 함께 보내 주세요.' },
      { status: 400 }
    );
  }

  const validationError = validateEditableImageBatch([file], assetKind);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (thumbnailFile) {
    const thumbnailValidationError = validateEditableImageBatch([thumbnailFile], assetKind);
    if (thumbnailValidationError) {
      return NextResponse.json({ error: thumbnailValidationError }, { status: 400 });
    }
  }

  const buffer = uploadPayload?.buffer ?? null;
  const thumbnailBuffer = uploadPayload?.thumbnailBuffer ?? null;
  const uploadSessionId =
    uploadPayload?.uploadSessionId || 'legacy-mobile-upload';

  if (!buffer) {
    return NextResponse.json(
      { error: '이미지 파일을 읽지 못했습니다. 다시 시도해 주세요.' },
      { status: 400 }
    );
  }

  const serverValidation = validateServerSideImagePayload(file, buffer, assetKind);
  if ('error' in serverValidation) {
    return NextResponse.json({ error: serverValidation.error }, { status: 400 });
  }

  const thumbnailValidation =
    thumbnailFile && thumbnailBuffer
      ? validateServerSideImagePayload(thumbnailFile, thumbnailBuffer, assetKind)
      : null;

  if (thumbnailValidation && 'error' in thumbnailValidation) {
    return NextResponse.json({ error: thumbnailValidation.error }, { status: 400 });
  }

  const storedFileName = buildStoredFileName(file.name, assetKind);
  const imagePath = `wedding-images/${pageSlug}/${storedFileName}`;
  const downloadToken = randomUUID();
  const thumbnailPath =
    thumbnailFile && thumbnailBuffer
      ? `wedding-images/${pageSlug}/${buildThumbnailFileName(storedFileName)}`
      : '';
  const thumbnailDownloadToken =
    thumbnailPath
      ? randomUUID()
      : '';
  const uploadedAt = new Date().toISOString();

  try {
    const bucketFile = bucket.file(imagePath);
    const thumbnailBucketFile = thumbnailPath ? bucket.file(thumbnailPath) : null;

    await Promise.all([
      bucketFile.save(buffer, {
        resumable: false,
        metadata: {
          contentType: serverValidation.contentType,
          metadata: {
            pageSlug,
            assetKind,
            uploadSessionId,
            uploadedAt,
            originalFileName: file.name,
            firebaseStorageDownloadTokens: downloadToken,
            variant: 'original',
          },
        },
      }),
      thumbnailBucketFile && thumbnailBuffer && thumbnailValidation && !('error' in thumbnailValidation)
        ? thumbnailBucketFile.save(thumbnailBuffer, {
            resumable: false,
            metadata: {
              contentType: thumbnailValidation.contentType,
              metadata: {
                pageSlug,
                assetKind,
                uploadSessionId,
                uploadedAt,
                originalFileName: thumbnailFile!.name,
                firebaseStorageDownloadTokens: thumbnailDownloadToken,
                variant: 'thumbnail',
              },
            },
          })
        : Promise.resolve(),
    ]);

    const encodedPath = encodeURIComponent(imagePath);
    const bucketName = bucket.name;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
    const thumbnailUrl = thumbnailPath
      ? `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
          thumbnailPath
        )}?alt=media&token=${thumbnailDownloadToken}`
      : url;

    return NextResponse.json(
      {
        name: storedFileName,
        url,
        path: imagePath,
        thumbnailUrl,
        thumbnailPath: thumbnailPath || imagePath,
        uploadedAt,
      },
      {
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
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
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 }
    );
  }

  if (!hasMobileClientEditorPermission(access.permissions, 'canUploadImages')) {
    return NextResponse.json(
      { error: buildMissingMobileClientEditorPermissionError('canUploadImages') },
      { status: 403 }
    );
  }

  const rateLimitResult = applyScopedInMemoryRateLimit({
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
    return NextResponse.json(
      { error: cleanupPayload.error },
      { status: 400 }
    );
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
