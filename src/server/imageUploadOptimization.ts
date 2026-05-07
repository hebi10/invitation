import 'server-only';

import path from 'node:path';

import sharp from 'sharp';

import type { EditableImageAssetKind } from '@/lib/imageUploadPolicy';

export type UploadImageVariantName = 'original' | 'content' | 'thumbnail';

export type UploadImageVariantPolicy = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

export type UploadImagePolicy = Record<UploadImageVariantName, UploadImageVariantPolicy>;

export type OptimizedUploadImage = {
  variant: UploadImageVariantName;
  buffer: Buffer;
  fileName: string;
  contentType: 'image/webp';
};

export type OptimizedUploadImages = Record<UploadImageVariantName, OptimizedUploadImage>;

const WEBP_CONTENT_TYPE = 'image/webp' as const;

const IMAGE_VARIANT_POLICY_BY_KIND: Record<EditableImageAssetKind, UploadImagePolicy> = {
  cover: {
    original: { maxWidth: 2400, maxHeight: 2400, quality: 85 },
    content: { maxWidth: 1600, maxHeight: 1600, quality: 82 },
    thumbnail: { maxWidth: 720, maxHeight: 720, quality: 78 },
  },
  gallery: {
    original: { maxWidth: 2400, maxHeight: 2400, quality: 84 },
    content: { maxWidth: 1400, maxHeight: 1400, quality: 80 },
    thumbnail: { maxWidth: 720, maxHeight: 720, quality: 76 },
  },
  favicon: {
    original: { maxWidth: 512, maxHeight: 512, quality: 82 },
    content: { maxWidth: 256, maxHeight: 256, quality: 80 },
    thumbnail: { maxWidth: 96, maxHeight: 96, quality: 78 },
  },
  'share-preview': {
    original: { maxWidth: 2400, maxHeight: 2400, quality: 85 },
    content: { maxWidth: 1600, maxHeight: 1600, quality: 82 },
    thumbnail: { maxWidth: 720, maxHeight: 720, quality: 78 },
  },
  'kakao-card': {
    original: { maxWidth: 2400, maxHeight: 2400, quality: 85 },
    content: { maxWidth: 1600, maxHeight: 1600, quality: 82 },
    thumbnail: { maxWidth: 720, maxHeight: 720, quality: 78 },
  },
};

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

function buildBaseName(fileName: string, assetKind: EditableImageAssetKind) {
  const parsedName = path.parse(fileName).name;
  const sanitizedName = sanitizeFileNameSegment(parsedName);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const prefix = sanitizeFileNameSegment(assetKind) || 'image';

  return sanitizedName
    ? `${prefix}-${sanitizedName}-${suffix}`
    : `${prefix}-${suffix}`;
}

function buildVariantFileName(
  baseName: string,
  variant: UploadImageVariantName
) {
  if (variant === 'content') {
    return `content-${baseName}.webp`;
  }

  if (variant === 'thumbnail') {
    return `thumb-${baseName}.webp`;
  }

  return `${baseName}.webp`;
}

async function buildVariantBuffer(
  source: Buffer,
  policy: UploadImageVariantPolicy
) {
  return sharp(source, {
    failOn: 'truncated',
    limitInputPixels: 20_000_000,
  })
    .rotate()
    .resize({
      width: policy.maxWidth,
      height: policy.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: policy.quality,
      effort: 5,
    })
    .toBuffer();
}

export function getUploadImageVariantPolicy(assetKind: EditableImageAssetKind) {
  return IMAGE_VARIANT_POLICY_BY_KIND[assetKind];
}

export async function buildOptimizedUploadImages({
  buffer,
  fileName,
  assetKind,
}: {
  buffer: Buffer;
  fileName: string;
  assetKind: EditableImageAssetKind;
}): Promise<OptimizedUploadImages> {
  const policy = getUploadImageVariantPolicy(assetKind);
  const baseName = buildBaseName(fileName, assetKind);
  const [originalBuffer, contentBuffer, thumbnailBuffer] = await Promise.all([
    buildVariantBuffer(buffer, policy.original),
    buildVariantBuffer(buffer, policy.content),
    buildVariantBuffer(buffer, policy.thumbnail),
  ]);

  return {
    original: {
      variant: 'original',
      buffer: originalBuffer,
      fileName: buildVariantFileName(baseName, 'original'),
      contentType: WEBP_CONTENT_TYPE,
    },
    content: {
      variant: 'content',
      buffer: contentBuffer,
      fileName: buildVariantFileName(baseName, 'content'),
      contentType: WEBP_CONTENT_TYPE,
    },
    thumbnail: {
      variant: 'thumbnail',
      buffer: thumbnailBuffer,
      fileName: buildVariantFileName(baseName, 'thumbnail'),
      contentType: WEBP_CONTENT_TYPE,
    },
  };
}
