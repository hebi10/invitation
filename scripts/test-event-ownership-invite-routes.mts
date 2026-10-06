import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { NextResponse } from 'next/server';
import ts from 'typescript';

import { normalizeInvitationPageSlugInput } from '../src/lib/invitationPagePersistence.ts';
import * as customerAuthVerification from '../src/server/customerAuthVerification.ts';
import { toSafeHttpErrorResponse } from '../src/server/apiErrorResponse.ts';

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

// Run the real route with authentication/database I/O isolated to local fixtures.
// Removing its admin guard must allow a forbidden consume and fail these checks.
class CustomerApiAuthError extends Error {}
class EventOwnershipInviteError extends Error {}
for (const fixture of [
  { name: 'administrator', admin: true, verified: true, status: 403 },
  { name: 'customer', admin: false, verified: true, status: 200 },
  { name: 'admin lookup failure', admin: new Error('permission lookup failed'), verified: true, status: 500 },
  { name: 'unverified customer', admin: false, verified: false, status: 403 },
]) {
  let consumeCount = 0;
  const exports: { POST?: (request: Request, context: object) => Promise<Response> } = {};
  const compiledRoute = ts.transpileModule(customerSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(compiledRoute, {
    exports,
    console: { error() {} },
    require(id: string) {
      if (id === 'next/server') return { NextResponse };
      if (id === '@/lib/invitationPagePersistence') return { normalizeInvitationPageSlugInput };
      if (id === '@/server/apiErrorResponse') return { toSafeHttpErrorResponse };
      if (id === '@/server/customerAuthVerification') return customerAuthVerification;
      if (id === '@/server/customerApiAuth') return {
        CustomerApiAuthError,
        verifyCustomerRequest: async () => ({
          uid: 'signed-in-user', email: 'customer@example.test', name: '고객',
          email_verified: fixture.verified, firebase: { sign_in_provider: 'password' },
        }),
      };
      if (id === '@/server/adminUserServerService') return {
        isServerAdminUserEnabled: async (uid: string) => {
          assert.equal(uid, 'signed-in-user');
          if (fixture.admin instanceof Error) throw fixture.admin;
          return fixture.admin;
        },
      };
      if (id === '@/server/requestRateLimit') return {
        applyScopedRateLimit: async () => ({ allowed: true }),
        buildRateLimitHeaders: () => ({}),
      };
      if (id === '@/server/eventOwnershipInviteService') return {
        EventOwnershipInviteError,
        consumeEventOwnershipInvite: async (input: { pageSlug: string; token: string; customer: { uid: string } }) => {
          assert.equal(input.pageSlug, 'sample');
          assert.equal(input.token, 'invite-token');
          assert.equal(input.customer.uid, 'signed-in-user');
          consumeCount += 1;
          return { slug: 'sample', eventId: 'event-sample' };
        },
      };
      throw new Error(`Unexpected route dependency: ${id}`);
    },
  });
  assert.ok(exports.POST);
  const response = await exports.POST(new Request('https://example.test/api/customer/events/sample/ownership-invite', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'invite-token' }),
  }), { params: Promise.resolve({ slug: 'sample' }) });
  assert.equal(response.status, fixture.status, fixture.name);
  assert.equal(response.headers.get('cache-control'), 'no-store', fixture.name);
  assert.equal(consumeCount, fixture.status === 200 ? 1 : 0,
    `${fixture.name}: rejected requests must preserve the unconsumed invite`);
  const payload = await response.json();
  if (fixture.status === 200) assert.deepEqual(payload, { success: true, slug: 'sample', eventId: 'event-sample' });
  if (fixture.status === 500) assert.doesNotMatch(payload.error, /permission lookup failed/);
}

// Execute the real automatic-connect effect with a valid link and each account state.
const clientAst = ts.createSourceFile(connectClientPath, connectClientSource,
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let consumeEffect: ts.Expression | undefined;
function findConsumeEffect(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(clientAst) === 'useEffect' &&
    node.arguments[0]?.getText(clientAst).includes('consumeCustomerOwnershipInvite(')) {
    consumeEffect = node.arguments[0];
  }
  ts.forEachChild(node, findConsumeEffect);
}
findConsumeEffect(clientAst);
assert.ok(consumeEffect, 'The automatic connection effect must exist');
for (const fixture of [
  { name: 'administrator', admin: true, loading: false, loggedIn: true, verified: true, state: 'admin-blocked', consumes: 0 },
  { name: 'unverified administrator', admin: true, loading: false, loggedIn: true, verified: false, state: 'admin-blocked', consumes: 0 },
  { name: 'customer', admin: false, loading: false, loggedIn: true, verified: true, state: 'connecting', consumes: 1 },
  { name: 'loading permissions', admin: false, loading: true, loggedIn: true, verified: true, state: 'checking-link', consumes: 0 },
  { name: 'signed out', admin: false, loading: false, loggedIn: false, verified: true, state: 'login-required', consumes: 0 },
  { name: 'unverified customer', admin: false, loading: false, loggedIn: true, verified: false, state: 'verification-required', consumes: 0 },
]) {
  let state = '';
  let consumeCount = 0;
  let destination = '';
  const effect = runInNewContext(ts.transpileModule(`(${consumeEffect.getText(clientAst)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    linkValidated: true, token: 'invite-token', tokenMarker: 'token-digest', slug: 'sample',
    isAdminLoading: fixture.loading, isAdminLoggedIn: fixture.admin, isLoggedIn: fixture.loggedIn,
    authUser: fixture.loggedIn ? { uid: 'signed-in-user', emailVerified: fixture.verified } : null,
    attemptedConsumeRef: { current: null },
    setState: (next: string) => { state = next; }, setErrorMessage() {},
    consumeCustomerOwnershipInvite: async (slug: string, token: string) => {
      assert.equal(slug, 'sample'); assert.equal(token, 'invite-token'); consumeCount += 1;
    },
    router: { replace: (next: string) => { destination = next; } },
  }) as () => void;
  effect();
  await Promise.resolve();
  assert.equal(state, fixture.state, fixture.name);
  assert.equal(consumeCount, fixture.consumes, `${fixture.name}: automatic token consumption`);
  assert.equal(destination, fixture.consumes ? '/page-wizard/sample' : '', fixture.name);
}

console.log('event ownership invite route and account boundary checks passed');
