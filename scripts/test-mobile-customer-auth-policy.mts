import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const routeFiles = [
  'src/app/api/mobile/billing/fulfill/route.ts',
  'src/app/api/mobile/client-editor/drafts/route.ts',
];

for (const relativePath of routeFiles) {
  const source = readFileSync(path.join(repoRoot, relativePath), 'utf8');

  assert.doesNotMatch(
    source,
    /from\s+['"]@\/server\/firebaseAdmin['"]/,
    `${relativePath} must not import Firebase Admin Auth directly.`
  );
  assert.doesNotMatch(
    source,
    /\.verifyIdToken\s*\(/,
    `${relativePath} must use customerApiAuth instead of verifying tokens directly.`
  );
  assert.match(
    source,
    /\bverifyCustomerRequest\s*\(/,
    `${relativePath} must verify Firebase customer tokens through customerApiAuth.`
  );
  assert.match(
    source,
    /Customer authentication is required\./,
    `${relativePath} must preserve the mobile authentication error message.`
  );
}

console.log('mobile customer auth policy checks passed');
