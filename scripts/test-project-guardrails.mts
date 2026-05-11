import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const findings: string[] = [];

function readText(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    findings.push(message);
  }
}

function listSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return /\.(?:ts|tsx|mts)$/.test(entry) ? [fullPath] : [];
  });
}

function normalizeSourcePath(filePath: string) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function hasImportFrom(source: string, prefix: string) {
  return new RegExp(`from\\s+['"]${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(source);
}

const memoryRoute = readText('src/app/memory/[slug]/page.tsx');
assert(
  memoryRoute.includes('getMemoryPageMetadataSlugs') &&
    /generateStaticParams\(\)[\s\S]*getMemoryPageMetadataSlugs\(\)/m.test(memoryRoute),
  'memory route static params must include Firestore memory-page metadata snapshot slugs.'
);

const ciPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
assert(existsSync(ciPath), 'GitHub Actions CI workflow must exist at .github/workflows/ci.yml.');

if (existsSync(ciPath)) {
  const ci = readText('.github/workflows/ci.yml');
  for (const expected of [
    'npm ci',
    'npm run check',
    'npm run test:security-hardening',
    'npm run test:regression',
  ]) {
    assert(ci.includes(expected), `CI workflow must run ${expected}.`);
  }
}

const nextConfig = readText('next.config.ts');
assert(
  nextConfig.includes('Content-Security-Policy') &&
    nextConfig.includes('Content-Security-Policy-Report-Only') &&
    /isProduction[\s\S]*Content-Security-Policy/m.test(nextConfig),
  'production must send an enforced Content-Security-Policy header while non-production may stay report-only.'
);

const mobileImageRoute = readText('src/app/api/mobile/client-editor/pages/[slug]/images/route.ts');
assert(
  mobileImageRoute.includes('saveServerOptimizedEditableImage') &&
    !mobileImageRoute.includes('function sniffImageFormat') &&
    !mobileImageRoute.includes('function readImageDimensions'),
  'mobile image upload route must reuse the shared server image upload service instead of duplicating image validation.'
);

const sourceFiles = listSourceFiles(path.join(repoRoot, 'src'));
const serverToAppImports = sourceFiles
  .filter((filePath) => normalizeSourcePath(filePath).startsWith('src/server/'))
  .filter((filePath) => hasImportFrom(readFileSync(filePath, 'utf8'), '@/app'));
assert(
  serverToAppImports.length === 0,
  `server modules must not import from app modules:\n${serverToAppImports
    .map(normalizeSourcePath)
    .join('\n')}`
);

const libToAppComponentImports = sourceFiles
  .filter((filePath) => normalizeSourcePath(filePath).startsWith('src/lib/'))
  .filter((filePath) => hasImportFrom(readFileSync(filePath, 'utf8'), '@/app/_components'));
assert(
  libToAppComponentImports.length === 0,
  `lib modules must not import from app component modules:\n${libToAppComponentImports
    .map(normalizeSourcePath)
    .join('\n')}`
);

const broadServicesImports = sourceFiles.filter((filePath) => {
  const sourcePath = normalizeSourcePath(filePath);
  if (
    sourcePath === 'src/services/index.ts' ||
    sourcePath.startsWith('src/services/')
  ) {
    return false;
  }

  return /from\s+['"]@\/services['"]/.test(readFileSync(filePath, 'utf8'));
});
assert(
  broadServicesImports.length === 0,
  `import from @/services barrel directly is too broad; import the specific service module instead:\n${broadServicesImports
    .map(normalizeSourcePath)
    .join('\n')}`
);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log('project guardrail checks passed');
