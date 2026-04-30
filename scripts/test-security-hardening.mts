import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const timeout = setTimeout(() => {
  console.error('timeout');
  process.exit(124);
}, 170_000);

type Finding = {
  file: string;
  message: string;
};

const findings: Finding[] = [];
const repoRoot = process.cwd();

function readText(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assert(condition: boolean, file: string, message: string) {
  if (!condition) {
    findings.push({ file, message });
  }
}

function listRouteFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listRouteFiles(fullPath));
      continue;
    }

    if (entry === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

const gitignore = readText('.gitignore');
assert(
  /(^|\r?\n)\.gstack\/(\r?\n|$)/.test(gitignore),
  '.gitignore',
  '.gstack/ must be ignored so local security reports are not committed.'
);

const nextConfig = readText('next.config.ts');
for (const header of [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
]) {
  assert(
    nextConfig.includes(header),
    'next.config.ts',
    `Missing baseline security header: ${header}.`
  );
}

const apiDirectory = path.join(repoRoot, 'src', 'app', 'api');
if (existsSync(apiDirectory)) {
  for (const routeFile of listRouteFiles(apiDirectory)) {
    const source = readFileSync(routeFile, 'utf8');
    const relativePath = path.relative(repoRoot, routeFile);

    assert(
      !/NextResponse\.json\(\s*\{\s*(?:error|message|details):\s*(?:error|err)\.message\s*\}/m.test(
        source
      ),
      relativePath,
      'Route returns raw error.message in a JSON response.'
    );

    assert(
      !/(?:error|err)\s+instanceof\s+Error\s*&&\s*(?:error|err)\.message\.trim\(\)\s*\?\s*(?:error|err)\.message/m.test(
        source
      ),
      relativePath,
      'Route uses raw error.message as a fallback response.'
    );
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}: ${finding.message}`);
  }
  clearTimeout(timeout);
  process.exit(1);
}

console.log('security hardening checks passed');
clearTimeout(timeout);
