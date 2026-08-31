import assert from 'node:assert/strict';
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

function check(condition: boolean, file: string, message: string) {
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

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return /\.(?:ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

const gitignore = readText('.gitignore');
check(
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
  check(
    nextConfig.includes(header),
    'next.config.ts',
    `Missing baseline security header: ${header}.`
  );
}

check(
  nextConfig.includes("form-action 'self' https://sharer.kakao.com"),
  'next.config.ts',
  'CSP form-action must allow Kakao share popup form posts.'
);

const apiDirectory = path.join(repoRoot, 'src', 'app', 'api');
if (existsSync(apiDirectory)) {
  for (const routeFile of listRouteFiles(apiDirectory)) {
    const source = readFileSync(routeFile, 'utf8');
    const relativePath = path.relative(repoRoot, routeFile);

    check(
      !/NextResponse\.json\(\s*\{\s*(?:error|message|details):\s*(?:error|err)\.message\s*\}/m.test(
        source
      ),
      relativePath,
      'Route returns raw error.message in a JSON response.'
    );

    check(
      !/(?:error|err)\s+instanceof\s+Error\s*&&\s*(?:error|err)\.message\.trim\(\)\s*\?\s*(?:error|err)\.message/m.test(
        source
      ),
      relativePath,
      'Route uses raw error.message as a fallback response.'
    );
  }
}

const firestoreRules = readText('firestore.rules');
check(
  !/match\s+\/ownershipInvites\b/.test(firestoreRules),
  'firestore.rules',
  'Ownership invites must not gain a direct client allow rule.'
);

const ownershipInviteRepositoryPath = 'src/server/repositories/eventOwnershipInviteRepository.ts';
const adminEventDeletionRepositoryPath =
  'src/server/repositories/adminEventDeletionRepository.ts';
const ownershipInviteReferences = listSourceFiles(path.join(repoRoot, 'src'))
  .filter((file) => readFileSync(file, 'utf8').includes("'ownershipInvites'"))
  .map((file) => path.relative(repoRoot, file).replaceAll(path.sep, '/'));
const allowedOwnershipInviteRepositories = new Set([
  ownershipInviteRepositoryPath,
  adminEventDeletionRepositoryPath,
]);
assert.deepEqual(
  ownershipInviteReferences.sort(),
  [...allowedOwnershipInviteRepositories].sort()
);

const ownershipInviteRepositorySource = readText(ownershipInviteRepositoryPath);
const adminEventDeletionRepositorySource = readText(adminEventDeletionRepositoryPath);
const ownershipInviteCreateOrUpdate = /transaction\.set\(\s*inviteRef\b/;
const ownershipInviteDelete =
  /deleteEventSubcollection\(\s*job\.eventId,\s*EVENT_OWNERSHIP_INVITES_COLLECTION\s*\)/;

check(
  ownershipInviteCreateOrUpdate.test(ownershipInviteRepositorySource) &&
    !ownershipInviteDelete.test(ownershipInviteRepositorySource),
  ownershipInviteRepositoryPath,
  'Ownership invite creation and updates must remain in the ownership invite repository.'
);
check(
  ownershipInviteDelete.test(adminEventDeletionRepositorySource) &&
    !ownershipInviteCreateOrUpdate.test(adminEventDeletionRepositorySource),
  adminEventDeletionRepositoryPath,
  'Ownership invite cleanup must remain limited to the admin deletion repository.'
);
check(
  ownershipInviteRepositorySource.includes('runTransaction'),
  ownershipInviteRepositoryPath,
  'Ownership invite writes must stay transaction-backed.'
);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}: ${finding.message}`);
  }
  clearTimeout(timeout);
  process.exit(1);
}

console.log('security hardening checks passed');
clearTimeout(timeout);
