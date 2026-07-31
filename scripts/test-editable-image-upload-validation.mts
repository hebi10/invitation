import assert from 'node:assert/strict';

import sharp from 'sharp';

import {
  EditableImageUploadError,
  validateServerSideImagePayload,
} from '@/server/editableImageUploadService';

async function createJpeg(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#d9b7a0',
    },
  })
    .jpeg()
    .toBuffer();
}

function createFile(
  buffer: Buffer,
  name: string,
  type: string
) {
  return new File([buffer], name, { type });
}

const validBuffer = await createJpeg(300, 300);
const validFile = createFile(validBuffer, 'valid.jpg', 'image/jpeg');
assert.doesNotThrow(() =>
  validateServerSideImagePayload(validFile, validBuffer, 'gallery')
);

const mimeMismatchFile = createFile(validBuffer, 'mismatch.png', 'image/png');
assert.throws(
  () =>
    validateServerSideImagePayload(
      mimeMismatchFile,
      validBuffer,
      'gallery'
    ),
  EditableImageUploadError
);

const textBuffer = Buffer.from('not-an-image', 'utf8');
const textFile = createFile(textBuffer, 'fake.jpg', 'image/jpeg');
assert.throws(
  () => validateServerSideImagePayload(textFile, textBuffer, 'gallery'),
  EditableImageUploadError
);

const extremeRatioBuffer = await createJpeg(2400, 240);
const extremeRatioFile = createFile(
  extremeRatioBuffer,
  'extreme.jpg',
  'image/jpeg'
);
assert.throws(
  () =>
    validateServerSideImagePayload(
      extremeRatioFile,
      extremeRatioBuffer,
      'cover'
    ),
  EditableImageUploadError
);

console.log('editable image upload validation checks passed');
