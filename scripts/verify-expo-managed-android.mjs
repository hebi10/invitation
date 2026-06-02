import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] === 'debug' ? 'debug' : 'kotlin';
const rootDir = resolve(import.meta.dirname, '..');
const mobileAndroidDir = resolve(rootDir, 'apps', 'mobile', 'android');
const rootAndroidDir = resolve(rootDir, 'android');

if (!existsSync(mobileAndroidDir) && !existsSync(rootAndroidDir)) {
  console.log(
    `[android:verify:${mode}] Expo managed app: no native Android project is checked in. ` +
      'Use npm run typecheck:mobile, npm run lint:mobile, and EAS build profiles for native validation.'
  );
  process.exit(0);
}

console.error(
  `[android:verify:${mode}] Native Android project detected, but this repository has no safe Gradle verifier configured. ` +
    'Add a timeout-protected npm script before running native Gradle verification.'
);
process.exit(1);
