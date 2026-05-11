import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  type EditableImageAssetKind,
  validateEditableImageBatch,
} from '@/lib/imageUploadPolicy';

import { getServerStorageBucket } from './firebaseAdmin';
import { buildOptimizedUploadImages } from './imageUploadOptimization';

export const EDITABLE_IMAGE_UPLOAD_ASSET_KINDS: EditableImageAssetKind[] = [
  'cover',
  'favicon',
  'gallery',
  'share-preview',
  'kakao-card',
];

type SniffedImageFormat = 'jpeg' | 'png' | 'webp';
type ImageDimensions = { width: number; height: number };

const MAX_IMAGE_DIMENSION = 6000;
const MAX_IMAGE_PIXELS = 16_000_000;
const MIN_IMAGE_DIMENSION = 240;
const MIN_FAVICON_DIMENSION = 48;
const MAX_ASPECT_RATIO_BY_KIND: Record<EditableImageAssetKind, number> = {
  cover: 4,
  gallery: 4,
  favicon: 1.8,
  'share-preview': 4,
  'kakao-card': 4,
};

export class EditableImageUploadError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EditableImageUploadError';
    this.status = status;
  }
}

export interface ServerEditableImageUploadResult {
  name: string;
  url: string;
  path: string;
  originalUrl: string;
  originalPath: string;
  thumbnailUrl: string;
  thumbnailPath: string;
  uploadedAt: string;
}

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

function buildDownloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    storagePath
  )}?alt=media&token=${token}`;
}

function validateServerSideImagePayload(
  file: File,
  buffer: Buffer,
  assetKind: EditableImageAssetKind
) {
  const format = sniffImageFormat(buffer);
  if (!format) {
    throw new EditableImageUploadError(
      400,
      '지원하지 않는 이미지 데이터입니다. JPG, PNG, WEBP 파일만 업로드할 수 있습니다.'
    );
  }

  if (file.type && !mimeMatchesFormat(file.type, format)) {
    throw new EditableImageUploadError(
      400,
      '파일 확장자 또는 MIME 타입이 실제 이미지 데이터와 일치하지 않습니다.'
    );
  }

  const dimensions = readImageDimensions(buffer, format);
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new EditableImageUploadError(
      400,
      '이미지 해상도를 확인할 수 없습니다. 다른 이미지를 선택해 주세요.'
    );
  }

  const minDimension = assetKind === 'favicon' ? MIN_FAVICON_DIMENSION : MIN_IMAGE_DIMENSION;

  if (dimensions.width < minDimension || dimensions.height < minDimension) {
    throw new EditableImageUploadError(
      400,
      assetKind === 'favicon'
        ? `파비콘 이미지는 가로/세로 ${MIN_FAVICON_DIMENSION}px 이상이어야 합니다.`
        : `이미지는 가로/세로 ${MIN_IMAGE_DIMENSION}px 이상이어야 합니다.`
    );
  }

  if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
    throw new EditableImageUploadError(
      400,
      `이미지 해상도는 가로/세로 최대 ${MAX_IMAGE_DIMENSION}px까지만 허용됩니다.`
    );
  }

  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    throw new EditableImageUploadError(
      400,
      '이미지 해상도가 너무 큽니다. 더 작은 이미지를 사용해 주세요.'
    );
  }

  const aspectRatio = Math.max(
    dimensions.width / dimensions.height,
    dimensions.height / dimensions.width
  );
  const maxAspectRatio = MAX_ASPECT_RATIO_BY_KIND[assetKind];

  if (aspectRatio > maxAspectRatio) {
    throw new EditableImageUploadError(
      400,
      '이미지 비율이 너무 극단적입니다. 더 균형 잡힌 비율의 이미지를 사용해 주세요.'
    );
  }
}

export function readEditableImageAssetKind(
  value: FormDataEntryValue | null
): EditableImageAssetKind | null {
  if (typeof value !== 'string') {
    return null;
  }

  return EDITABLE_IMAGE_UPLOAD_ASSET_KINDS.includes(value as EditableImageAssetKind)
    ? (value as EditableImageAssetKind)
    : null;
}

export async function readEditableImageUploadFormData(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const assetKind = readEditableImageAssetKind(formData?.get('assetKind') ?? null);

  if (!(file instanceof File) || !assetKind) {
    throw new EditableImageUploadError(
      400,
      '업로드할 이미지와 자산 종류를 함께 보내 주세요.'
    );
  }

  return { file, assetKind };
}

export async function saveServerOptimizedEditableImage({
  pageSlug,
  file,
  assetKind,
  uploadSessionId,
}: {
  pageSlug: string;
  file: File;
  assetKind: EditableImageAssetKind;
  uploadSessionId?: string | null;
}): Promise<ServerEditableImageUploadResult> {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) {
    throw new EditableImageUploadError(400, '페이지 식별자가 없습니다.');
  }

  const bucket = getServerStorageBucket();
  if (!bucket) {
    throw new EditableImageUploadError(
      503,
      '이미지 저장소가 준비되지 않았습니다. 관리자에게 문의해 주세요.'
    );
  }

  const validationError = validateEditableImageBatch([file], assetKind);
  if (validationError) {
    throw new EditableImageUploadError(400, validationError);
  }

  const buffer = await file
    .arrayBuffer()
    .then((arrayBuffer) => Buffer.from(arrayBuffer))
    .catch(() => null);

  if (!buffer) {
    throw new EditableImageUploadError(
      400,
      '이미지 파일을 읽지 못했습니다. 다시 시도해 주세요.'
    );
  }

  validateServerSideImagePayload(file, buffer, assetKind);

  const optimizedImages = await buildOptimizedUploadImages({
    buffer,
    fileName: file.name,
    assetKind,
  });
  const storedFileName = optimizedImages.content.fileName;
  const originalPath = `wedding-images/${normalizedPageSlug}/${optimizedImages.original.fileName}`;
  const imagePath = `wedding-images/${normalizedPageSlug}/${optimizedImages.content.fileName}`;
  const thumbnailPath = `wedding-images/${normalizedPageSlug}/${optimizedImages.thumbnail.fileName}`;
  const downloadToken = randomUUID();
  const originalDownloadToken = randomUUID();
  const thumbnailDownloadToken = randomUUID();

  const bucketFile = bucket.file(imagePath);
  const originalBucketFile = bucket.file(originalPath);
  const thumbnailBucketFile = bucket.file(thumbnailPath);

  await Promise.all([
    originalBucketFile.save(optimizedImages.original.buffer, {
      resumable: false,
      metadata: {
        contentType: optimizedImages.original.contentType,
        metadata: {
          pageSlug: normalizedPageSlug,
          assetKind,
          ...(uploadSessionId ? { uploadSessionId } : {}),
          originalFileName: file.name,
          firebaseStorageDownloadTokens: originalDownloadToken,
          variant: 'original',
        },
      },
    }),
    bucketFile.save(optimizedImages.content.buffer, {
      resumable: false,
      metadata: {
        contentType: optimizedImages.content.contentType,
        metadata: {
          pageSlug: normalizedPageSlug,
          assetKind,
          ...(uploadSessionId ? { uploadSessionId } : {}),
          originalFileName: file.name,
          firebaseStorageDownloadTokens: downloadToken,
          variant: 'content',
        },
      },
    }),
    thumbnailBucketFile.save(optimizedImages.thumbnail.buffer, {
      resumable: false,
      metadata: {
        contentType: optimizedImages.thumbnail.contentType,
        metadata: {
          pageSlug: normalizedPageSlug,
          assetKind,
          ...(uploadSessionId ? { uploadSessionId } : {}),
          originalFileName: file.name,
          firebaseStorageDownloadTokens: thumbnailDownloadToken,
          variant: 'thumbnail',
        },
      },
    }),
  ]);

  const bucketName = bucket.name;

  return {
    name: storedFileName,
    url: buildDownloadUrl(bucketName, imagePath, downloadToken),
    path: imagePath,
    originalUrl: buildDownloadUrl(bucketName, originalPath, originalDownloadToken),
    originalPath,
    thumbnailUrl: buildDownloadUrl(bucketName, thumbnailPath, thumbnailDownloadToken),
    thumbnailPath,
    uploadedAt: new Date().toISOString(),
  };
}
