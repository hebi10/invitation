import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readText(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const sessionSource = readText('src/server/clientEditorSession.ts');
const mobileApiSource = readText('src/server/clientEditorMobileApi.ts');
const highRiskSource = readText('src/server/mobileClientEditorHighRisk.ts');

for (const field of ['sessionId', 'ownerUid', 'eventId', 'deviceIdHash', 'issuedVia']) {
  assert(
    sessionSource.includes(field),
    `Client editor session payload must include ${field} for server-backed mobile sessions.`
  );
}

assert(
  mobileApiSource.includes('createServerBackedMobileClientEditorSession'),
  'Mobile session issuance must go through the server-backed mobile session helper.'
);

assert(
  mobileApiSource.includes('resolveMobileClientEditorPermissions(') &&
    mobileApiSource.includes('scopes'),
  'Mobile permissions must be resolved from session scopes instead of static owner permissions.'
);

assert(
  !/OWNER_MOBILE_CLIENT_EDITOR_PERMISSIONS[\s\S]*canManagePublication:\s*true[\s\S]*canManageTickets:\s*true[\s\S]*canIssueLinkToken:\s*true/.test(
    mobileApiSource
  ),
  'Owner mobile sessions must not statically grant publication, ticket, and link-token permissions.'
);

for (const field of ['sessionId', 'deviceIdHash', 'allowedActions']) {
  assert(
    highRiskSource.includes(field),
    `High-risk mobile token must include ${field} binding.`
  );
}

console.log('mobile session security policy checks passed');
