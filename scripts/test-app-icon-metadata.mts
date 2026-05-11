import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const appIconPath = 'public/codex-app-icon.png';
const layoutSource = readFileSync('src/app/layout.tsx', 'utf8');

assert.equal(existsSync(appIconPath), true, `${appIconPath} must exist`);

const iconBytes = readFileSync(appIconPath);
assert.deepEqual(
  [...iconBytes.subarray(0, 8)],
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'app icon must be a PNG file'
);

assert.match(
  layoutSource,
  /url:\s*['"]\/codex-app-icon\.png['"]/,
  'layout metadata must point to /codex-app-icon.png'
);

assert.doesNotMatch(
  layoutSource,
  /icon:\s*['"]\/favicon\.ico['"]/,
  'layout metadata must not keep favicon.ico as the primary app icon'
);

console.log('app icon metadata checks passed');
