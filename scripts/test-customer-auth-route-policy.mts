import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const customerApiRoot = path.join(repoRoot, 'src', 'app', 'api', 'customer');

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteFiles(fullPath);
    }

    return entry.name === 'route.ts' ? [fullPath] : [];
  });
}

for (const routeFile of listRouteFiles(customerApiRoot)) {
  const source = readFileSync(routeFile, 'utf8');
  const relativePath = path.relative(repoRoot, routeFile);

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
    /\bverifyCustomer(?:Request|Uid)\s*\(/,
    `${relativePath} must verify the customer through customerApiAuth.`
  );
}

console.log('customer auth route policy checks passed');
