import assert from 'node:assert/strict';

import sharp from 'sharp';

import {
  buildOptimizedUploadImages,
  getUploadImageVariantPolicy,
} from '../src/server/imageUploadOptimization';

async function readMetadata(buffer: Buffer) {
  return sharp(buffer).metadata();
}

async function createSourceImage() {
  return sharp({
    create: {
      width: 3200,
      height: 2200,
      channels: 3,
      background: '#d9b7a0',
    },
  })
    .jpeg({ quality: 95 })
    .withMetadata({
      exif: {
        IFD0: {
          Copyright: 'should be stripped',
        },
      },
    })
    .toBuffer();
}

async function testBuildsLargeContentAndThumbnailWebpVariants() {
  const source = await createSourceImage();
  const result = await buildOptimizedUploadImages({
    buffer: source,
    fileName: 'wedding-photo.JPG',
    assetKind: 'gallery',
  });

  assert.equal(result.original.contentType, 'image/webp');
  assert.equal(result.content.contentType, 'image/webp');
  assert.equal(result.thumbnail.contentType, 'image/webp');
  assert.match(result.original.fileName, /^gallery-.+\.webp$/);
  assert.match(result.content.fileName, /^content-gallery-.+\.webp$/);
  assert.match(result.thumbnail.fileName, /^thumb-gallery-.+\.webp$/);

  const originalMetadata = await readMetadata(result.original.buffer);
  const contentMetadata = await readMetadata(result.content.buffer);
  const thumbnailMetadata = await readMetadata(result.thumbnail.buffer);

  assert.equal(originalMetadata.format, 'webp');
  assert.equal(contentMetadata.format, 'webp');
  assert.equal(thumbnailMetadata.format, 'webp');
  assert.equal(originalMetadata.exif, undefined);
  assert.equal(contentMetadata.exif, undefined);
  assert.equal(thumbnailMetadata.exif, undefined);

  assert.ok(Math.max(originalMetadata.width ?? 0, originalMetadata.height ?? 0) <= 2400);
  assert.ok(Math.max(contentMetadata.width ?? 0, contentMetadata.height ?? 0) <= 1400);
  assert.ok(Math.max(thumbnailMetadata.width ?? 0, thumbnailMetadata.height ?? 0) <= 720);
  assert.ok(result.thumbnail.buffer.length < result.content.buffer.length);
}

async function testPolicyKeepsQualityInRequestedRange() {
  for (const assetKind of ['cover', 'gallery', 'share-preview', 'kakao-card', 'favicon'] as const) {
    const policy = getUploadImageVariantPolicy(assetKind);
    for (const variant of [policy.original, policy.content, policy.thumbnail]) {
      assert.ok(variant.quality >= 75);
      assert.ok(variant.quality <= 85);
    }
  }
}

await testBuildsLargeContentAndThumbnailWebpVariants();
await testPolicyKeepsQualityInRequestedRange();

console.log('image upload optimization policy tests passed');
