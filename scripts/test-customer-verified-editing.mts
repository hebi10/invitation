import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Run the actual route and auth code; only Firebase/Storage operations are replaced.
// This account already owns the fixture invitation, as after an admin assignment.
const nativeRequire = createRequire(import.meta.url);
let emailVerified = false;
let provider = 'password';
let serviceCalls = 0;
const exportsCache = new Map<string, Record<string, unknown>>();
const customerServices = {
  CustomerEventClaimError: class extends Error {},
  getCustomerEditableInvitationPageSnapshot: async () => {
    serviceCalls += 1;
    return { status: 'ready', editableConfig: { slug: 'already-owned', version: 1 } };
  },
  saveCustomerEditableInvitationPageConfig: async () => {
    serviceCalls += 1;
    return { slug: 'already-owned', version: 2 };
  },
  getCustomerEventOwnershipSnapshot: async () => {
    serviceCalls += 1;
    return { status: 'owner' };
  },
  listCustomerOwnedEventSummaries: async () => {
    serviceCalls += 1;
    return [{ slug: 'already-owned' }];
  },
  listCustomerEventGuestbookComments: async () => {
    serviceCalls += 1;
    return [];
  },
  scheduleDeleteCustomerEventGuestbookComment: async () => { serviceCalls += 1; },
};

function loadSource(relativePath: string): Record<string, unknown> {
  const filename = path.resolve(relativePath);
  const cached = exportsCache.get(filename);
  if (cached) return cached;
  const exports: Record<string, unknown> = {};
  exportsCache.set(filename, exports);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, { exports, Error, URL, console, process: { env: {} }, require(name: string) {
    if (name === 'server-only') return {};
    if (name.endsWith('/firebaseAdmin')) return { getServerAuth: () => ({
      verifyIdToken: async (token: string) => {
        if (token !== 'fixture-owner-token') throw new Error('invalid token');
        return { uid: 'existing-owner', email_verified: emailVerified,
          firebase: { sign_in_provider: provider, identities: {} } };
      },
    }) };
    if (name === '@/server/customerEventsService') return customerServices;
    if (name === '@/server/requestRateLimit') return {
      applyScopedRateLimit: async () => ({ allowed: true }), buildRateLimitHeaders: () => ({}),
    };
    if (name === '@/server/editableImageUploadService') return {
      EditableImageUploadError: class extends Error {},
      readEditableImageUploadFormData: async () => ({ file: {}, assetKind: 'cover' }),
      saveServerOptimizedEditableImage: async () => { serviceCalls += 1; return { url: '/fixture.webp' }; },
    };
    if (name.startsWith('@/')) return loadSource(`src/${name.slice(2)}.ts`);
    if (name.startsWith('.')) return loadSource(path.join(path.dirname(filename), `${name}.ts`));
    return nativeRequire(name);
  } }, { filename });
  return exports;
}

const cases = [
  ['events/[slug]/editable', 'GET'],
  ['events/[slug]/editable', 'POST'],
  ['events/[slug]/images', 'POST'],
  ['events/[slug]/ownership', 'GET'],
  ['events/[slug]/comments', 'GET'],
  ['events/[slug]/comments/[commentId]', 'DELETE'],
  ['events', 'GET'],
] as const;

for (const [routePath, method] of cases) {
  const route = loadSource(`src/app/api/customer/${routePath}/route.ts`);
  const action = route[method] as (request: Request, context: unknown) => Promise<Response>;
  const call = (token: string | null) => action(new Request('https://example.test/api/customer/fixture', {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ config: { slug: 'already-owned' }, expectedVersion: 1 }) } : {}),
  }), { params: Promise.resolve({ slug: 'already-owned', commentId: 'comment-1' }) });

  for (const token of [null, 'forged-token']) {
    serviceCalls = 0;
    assert.equal((await call(token)).status, 401, `${method} ${routePath}: missing/forged token`);
    assert.equal(serviceCalls, 0);
  }
  emailVerified = false;
  provider = 'password';
  serviceCalls = 0;
  assert.equal((await call('fixture-owner-token')).status, 403,
    `${method} ${routePath}: an assigned owner must verify their email before accessing customer data`);
  assert.equal(serviceCalls, 0, 'No content read, save, upload or delete before email verification');

  emailVerified = true;
  assert.equal((await call('fixture-owner-token')).status, 200, `${method} ${routePath}: verified owner`);
  emailVerified = false;
  provider = 'google.com';
  assert.equal((await call('fixture-owner-token')).status, 200, `${method} ${routePath}: trusted provider`);
}

console.log('Verified customer editing, upload and management route checks passed');

// Execute the actual query-enabling expressions from both wizard entry points.
// Cached ownership must not start content requests before email verification.
for (const [filename, queryName] of [
  ['src/app/page-wizard/PageWizardClient.tsx', 'wizardLoadQuery'],
  ['src/app/page-wizard/PageWizardResultClient.tsx', 'resultQuery'],
] as const) {
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let gate: ts.Expression | undefined;
  let enabled: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node)) {
      if (node.name.getText(source) === 'requiresEmailVerification') gate = node.initializer;
      if (node.name.getText(source) === queryName && node.initializer && ts.isCallExpression(node.initializer)) {
        const options = node.initializer.arguments[0];
        if (options && ts.isObjectLiteralExpression(options)) {
          for (const option of options.properties) {
            if (ts.isPropertyAssignment(option) && option.name.getText(source) === 'enabled') enabled = option.initializer;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(enabled);
  for (const input of [
    { emailVerified: false, admin: false, experience: false, expected: false },
    { emailVerified: true, admin: false, experience: false, expected: true },
    { emailVerified: false, admin: true, experience: false, expected: true },
    { emailVerified: false, admin: false, experience: true, expected: true },
  ]) {
    const actual = runInNewContext(`const requiresEmailVerification = ${gate?.getText(source) ?? 'false'}; ${enabled.getText(source)};`, {
      initialSlug: 'already-owned', authUser: { uid: 'existing-owner', emailVerified: input.emailVerified },
      isLoggedIn: true, isAdminLoading: false, isAdminLoggedIn: input.admin, experience: input.experience,
    });
    assert.equal(actual, input.expected, `${queryName}: ${JSON.stringify(input)}`);
  }
}
console.log('Wizard editing and saved-result queries require verified customer sessions');

const authSource = ts.createSourceFile('adminAuth.ts', readFileSync('src/services/adminAuth.ts', 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
for (const functionName of ['resolveSignedInAuthSessionSnapshot', 'sendCurrentUserEmailVerification']) {
  const declaration = authSource.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === functionName);
  assert.ok(declaration);
  for (const initiallyVerified of [false, true]) {
    let tokenVerified = false;
    const user = {
      uid: 'existing-owner', email: 'customer@example.test', emailVerified: initiallyVerified,
      reload: async () => { user.emailVerified = true; },
      getIdToken: async (forceRefresh?: boolean) => {
        if (forceRefresh) tokenVerified = true;
        return tokenVerified ? 'verified-token' : 'previous-unverified-token';
      },
    };
    const code = ts.transpileModule(`${declaration.getText(authSource)}\n${functionName}(${functionName.startsWith('resolve') ? 'auth, user' : ''});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    await runInNewContext(code, {
      exports: {}, USE_FIREBASE: true, auth: { currentUser: user }, user, console,
      getAuthModules: async () => ({ auth: { currentUser: user } }),
      applyPreferredAuthLanguage: () => {},
      isUserAdmin: async () => false,
      toAuthUser: (value: typeof user) => ({ uid: value.uid, emailVerified: value.emailVerified }),
      toAdminUser: () => null,
    });
    assert.equal(tokenVerified, true,
      `${functionName}: verified UI state must only become available after refreshing the ID token, including initial restored sessions`);
  }
}
console.log('Email verification refresh updates the ID token before exposing the verified session');

// Restore a verified account with stale token claims and a transient refresh failure.
// Keep the account signed in, but do not open the editor until a retry refreshes the token.
{
  type Snapshot = { authUser: { uid: string; emailVerified: boolean } | null; isAdmin: boolean };
  const functions = ['resolveSignedInAuthSessionSnapshot', 'observeFirebaseSession', 'refreshCurrentFirebaseSession'];
  const source = functions.map((name) => {
    const declaration = authSource.statements.find((node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration);
    return declaration.getText(authSource);
  }).join('\n');
  let tokenVerified = false;
  let failNextRefresh = true;
  const user = {
    uid: 'restored-owner', email: 'customer@example.test', emailVerified: true,
    reload: async () => {},
    getIdToken: async (forceRefresh?: boolean) => {
      if (forceRefresh && failNextRefresh) {
        failNextRefresh = false;
        throw new Error('temporary token refresh failure');
      }
      if (forceRefresh) tokenVerified = true;
      return tokenVerified ? 'verified-token' : 'previous-unverified-token';
    },
  };
  const runtime = {} as {
    observeFirebaseSession: (callback: (snapshot: Snapshot) => void) => () => void;
    refreshCurrentFirebaseSession: () => Promise<Snapshot>;
  };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports: runtime, USE_FIREBASE: true, console: { error() {}, warn() {} },
    getAuthModules: async () => ({ auth: { currentUser: user }, authModule: {
      onAuthStateChanged: (_auth: unknown, callback: (currentUser: typeof user) => Promise<void>) => {
        void callback(user);
        return () => {};
      },
    } }),
    isUserAdmin: async () => false,
    toAuthUser: (value: typeof user) => ({ uid: value.uid, emailVerified: value.emailVerified }),
    toAdminUser: () => null,
  });
  let unsubscribe = () => {};
  const initial = await new Promise<Snapshot>((resolve) => {
    unsubscribe = runtime.observeFirebaseSession(resolve);
  });
  assert.equal(initial.authUser?.uid, 'restored-owner', 'A refresh failure must preserve the signed-in account');
  assert.equal(initial.authUser?.emailVerified, false, 'A stale restored token must retain the email-verification gate');
  assert.equal(tokenVerified, false);
  const recovered = await runtime.refreshCurrentFirebaseSession();
  assert.equal(recovered.authUser?.uid, 'restored-owner');
  assert.equal(recovered.authUser?.emailVerified, true, 'A successful retry must release the verification gate');
  assert.equal(tokenVerified, true, 'The retry must refresh token claims before opening the editor');
  unsubscribe();
}
console.log('Restored-session token failures retain the verification gate and recover on retry');
