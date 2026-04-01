import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), 'out');
const devToolsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true' ||
  process.env.ENABLE_DEV_TOOLS === 'true';

const removablePaths = [
  resolve(outDir, 'firebase-test'),
];

if (!existsSync(outDir) || devToolsEnabled) {
  process.exit(0);
}

for (const targetPath of removablePaths) {
  if (!existsSync(targetPath)) {
    continue;
  }

  rmSync(targetPath, { recursive: true, force: true });
  console.log(`[postbuild-static-cleanup] removed ${targetPath}`);
}
