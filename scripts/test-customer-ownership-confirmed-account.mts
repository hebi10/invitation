import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type TokenOptions = { forceRefresh?: boolean; expectedUid?: string };
type AuthUser = { uid: string; getIdToken: (forceRefresh?: boolean) => Promise<string> };
const auth = { currentUser: null as AuthUser | null };
const requests: Array<{ url: string; options: { headers: { Authorization: string }; body: string } }> = [];
const tokenCalls: string[] = [];

// Run the production Firebase token boundary with a local Auth SDK fixture.
// Real credentials, network and ownership records are never read or written.
const authSource = ts.createSourceFile('adminAuth.ts', readFileSync('src/services/adminAuth.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const tokenDeclaration = authSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'getCurrentFirebaseIdToken');
assert.ok(tokenDeclaration);
const tokenCode = ts.transpileModule(tokenDeclaration.getText(authSource), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const authExports: { getCurrentFirebaseIdToken?: (options?: TokenOptions) => Promise<string | null> } = {};
runInNewContext(tokenCode, { exports: authExports, Error, USE_FIREBASE: true, getAuthModules: async () => ({ auth }) });

const serviceCode = ts.transpileModule(readFileSync('src/services/eventOwnershipInviteService.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const service: { consumeCustomerOwnershipInvite?: (slug: string, token: string, expectedUid: string) => Promise<unknown> } = {};
runInNewContext(serviceCode, { exports: service, Error,
  require(id: string) {
    if (id === './adminAuth') return authExports;
    if (id === '@/lib/invitationPagePersistence') return { normalizeInvitationPageSlugInput: (value: string) => value.trim() };
    throw new Error(`Unexpected import: ${id}`);
  },
  fetch: async (url: string, options: typeof requests[number]['options']) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ slug: 'our-event', eventId: 'our-event-id' }) };
  },
});
assert.ok(service.consumeCustomerOwnershipInvite);
const consume = service.consumeCustomerOwnershipInvite;
const customer = (uid: string): AuthUser => ({ uid, async getIdToken(forceRefresh) {
  assert.equal(forceRefresh, true, 'Ownership must retain the existing forced refresh');
  tokenCalls.push(uid);
  return `local-fixture-token-for-${uid}`;
} });

auth.currentUser = customer('account-b');
await assert.rejects(() => consume('our-event', 'fixture-link', 'account-a'), /계정.*변경|계정.*일치/,
  'If Firebase already switched to B while the confirmation still shows A, no ownership request may be made');
assert.equal(requests.length, 0);
assert.deepEqual(tokenCalls, [], 'An account mismatch must be rejected before requesting that account token');

let finishToken: ((token: string) => void) | undefined;
auth.currentUser = { uid: 'account-a', getIdToken: () => new Promise<string>((resolve) => { finishToken = resolve; }) };
const pending = consume('our-event', 'fixture-link', 'account-a');
await new Promise<void>((resolve) => setImmediate(resolve));
assert.ok(finishToken);
auth.currentUser = customer('account-b');
finishToken('local-fixture-token-for-account-a');
await assert.rejects(() => pending, /계정.*변경|계정.*일치/,
  'A session switch during token refresh must stop the request and require confirmation again');
assert.equal(requests.length, 0);

auth.currentUser = null;
await assert.rejects(() => consume('our-event', 'fixture-link', 'account-a'), /로그인/,
  'Signing out before confirmation is sent must not use an earlier token');
assert.equal(requests.length, 0);

auth.currentUser = customer('account-a');
await assert.rejects(() => consume('our-event', 'fixture-link', ''), /계정|로그인/,
  'A missing confirmed identity must never fall back to whichever account is signed in');
assert.equal(requests.length, 0);

const result = await consume('our-event', 'fixture-link', 'account-a');
assert.equal((result as { eventId: string }).eventId, 'our-event-id');
assert.equal(requests.length, 1);
assert.equal(requests[0].url, '/api/customer/events/our-event/ownership-invite');
assert.equal(requests[0].options.headers.Authorization, 'Bearer local-fixture-token-for-account-a');
assert.deepEqual(JSON.parse(requests[0].options.body), { token: 'fixture-link' },
  'The API payload and ownership authorization policy must remain unchanged');

console.log('확인한 고객 계정과 실제 연결 토큰의 일치 및 계정 전환 경합 검증 통과');
