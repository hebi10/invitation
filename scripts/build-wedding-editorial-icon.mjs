#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = path.resolve('apps/mobile/assets/editorial/app-icon-design-source.webp');
const targets = [
  { output: 'apps/mobile/assets/icon-v3.png', size: 1024 },
  { output: 'apps/mobile/store/icon.png', size: 512 },
];

for (const target of targets) {
  const output = path.resolve(target.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharp(source)
    .resize(target.size, target.size, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.width !== target.size || metadata.height !== target.size) {
    throw new Error(target.output + ' has an unexpected image size');
  }
  console.log(target.output + ': ' + metadata.width + 'x' + metadata.height);
}
