import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const routes = {
  admin: path.join(
    repoRoot,
    'src',
    'app',
    'api',
    'admin',
    'events',
    '[slug]',
    'ownership-invite',
    'route.ts'
  ),
  publicStatus: path.join(
    repoRoot,
    'src',
    'app',
    'api',
    'connect',
    'events',
    '[slug]',
    'ownership-invite-status',
    'route.ts'
  ),
  customer: path.join(
    repoRoot,
    'src',
    'app',
    'api',
    'customer',
    'events',
    '[slug]',
    'ownership-invite',
    'route.ts'
  ),
};

for (const [name, routeFile] of Object.entries(routes)) {
  assert.ok(existsSync(routeFile), `${name} ownership invite route must exist.`);
}

const adminSource = readFileSync(routes.admin, 'utf8');
assert.match(adminSource, /\bverifyAdminRequest\s*\(/);
assert.match(adminSource, /\bissueEventOwnershipInvite\s*\(/);
assert.match(adminSource, /\bapplyScopedRateLimit\s*\(/);
assert.match(adminSource, /cache-control['"]?\s*:\s*['"]no-store/i);

const publicSource = readFileSync(routes.publicStatus, 'utf8');
assert.doesNotMatch(publicSource, /firebaseAdmin|verifyIdToken|consumeEventOwnershipInvite/);
assert.match(publicSource, /export\s+async\s+function\s+POST\s*\(/);
assert.match(publicSource, /\binspectEventOwnershipInvite\s*\(/);
assert.match(publicSource, /\bapplyScopedRateLimit\s*\(/);
assert.match(publicSource, /cache-control['"]?\s*:\s*['"]no-store/i);

const customerSource = readFileSync(routes.customer, 'utf8');
assert.match(customerSource, /\bverifyCustomerRequest\s*\(/);
assert.match(customerSource, /\bcanUseVerifiedCustomerFeatures\s*\(/);
assert.match(customerSource, /\bconsumeEventOwnershipInvite\s*\(/);
assert.match(customerSource, /\bapplyScopedRateLimit\s*\(/);
assert.match(customerSource, /cache-control['"]?\s*:\s*['"]no-store/i);

for (const routeFile of Object.values(routes)) {
  const source = readFileSync(routeFile, 'utf8');
  assert.match(
    source,
    /toSafeHttpErrorResponse|GENERIC_SERVER_ERROR_MESSAGE|EventOwnershipInviteError/,
    `${path.relative(repoRoot, routeFile)} must map errors safely.`
  );
  assert.match(
    source,
    /await\s+request\.json\s*\(/,
    `${path.relative(repoRoot, routeFile)} must read invite tokens from a JSON body.`
  );
}

const adminSummarySource = readFileSync(
  path.join(repoRoot, 'src', 'server', 'adminInvitationPagesService.ts'),
  'utf8'
);
const invitationPageServiceSource = readFileSync(
  path.join(repoRoot, 'src', 'services', 'invitationPageService.ts'),
  'utf8'
);
const adminPagesTabSource = readFileSync(
  path.join(repoRoot, 'src', 'app', 'admin', '_components', 'AdminPagesTab.tsx'),
  'utf8'
);
const customerAccountsTabSource = readFileSync(
  path.join(
    repoRoot,
    'src',
    'app',
    'admin',
    '_components',
    'AdminCustomerAccountsTab.tsx'
  ),
  'utf8'
);
const inviteDialogPath = path.join(
  repoRoot,
  'src',
  'app',
  'admin',
  '_components',
  'AdminOwnershipInviteDialog.tsx'
);

assert.match(adminSummarySource, /ownershipKind/);
assert.match(invitationPageServiceSource, /ownershipKind/);
assert.match(adminPagesTabSource, /고객 연결 링크/);
assert.match(customerAccountsTabSource, /고객 연결 링크/);
assert.match(
  adminPagesTabSource,
  /ownershipKind\s*!==\s*['"]customer['"]/,
  'customer-owned pages must not expose an enabled issue action'
);
assert.match(
  customerAccountsTabSource,
  /account\.isAdmin/,
  'only administrator-owned linked events may expose an issue action'
);
assert.ok(existsSync(inviteDialogPath), 'the shared ownership invite dialog must exist');
const inviteDialogSource = readFileSync(inviteDialogPath, 'utf8');
assert.match(inviteDialogSource, /role=['"]dialog['"]/);
assert.match(inviteDialogSource, /aria-modal=['"]true['"]/);
assert.match(inviteDialogSource, /navigator\.clipboard\.writeText/);
assert.doesNotMatch(inviteDialogSource, /localStorage|sessionStorage/);
assert.match(inviteDialogSource, /최신 링크/);

const connectLayoutPath = path.join(repoRoot, 'src', 'app', 'connect', 'layout.tsx');
const connectPagePath = path.join(
  repoRoot,
  'src',
  'app',
  'connect',
  '[slug]',
  'page.tsx'
);
const connectClientPath = path.join(
  repoRoot,
  'src',
  'app',
  'connect',
  '[slug]',
  'ConnectOwnershipClient.tsx'
);
for (const filePath of [connectLayoutPath, connectPagePath, connectClientPath]) {
  assert.ok(existsSync(filePath), `${path.relative(repoRoot, filePath)} must exist.`);
}

const connectLayoutSource = readFileSync(connectLayoutPath, 'utf8');
assert.match(connectLayoutSource, /AuthenticatedAppProviders/);
assert.match(connectLayoutSource, /index:\s*false/);
assert.match(connectLayoutSource, /follow:\s*false/);

const connectClientSource = readFileSync(connectClientPath, 'utf8');
assert.match(connectClientSource, /window\.location\.hash/);
assert.doesNotMatch(connectClientSource, /localStorage|sessionStorage/);
assert.match(connectClientSource, /FirebaseAuthLoginCard/);
assert.match(connectClientSource, /emailVerified/);
assert.match(connectClientSource, /sendVerificationEmail/);
assert.match(connectClientSource, /refreshAuthUser/);
assert.match(connectClientSource, /consumeCustomerOwnershipInvite/);
assert.match(
  connectClientSource,
  /router\.replace\(`\/page-wizard\/\$\{encodeURIComponent\(slug\)\}`\)/
);

console.log('event ownership invite route boundary checks passed');
