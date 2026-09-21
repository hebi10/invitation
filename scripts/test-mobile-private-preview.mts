import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';

const exports = {} as {
  issueInvitationPreviewToken: (slug: string, sessionId: string, expiresAt: number) => { token: string; expiresAt: number };
  verifyInvitationPreviewToken: (token: string, slug: string) => { sessionId: string } | null;
};
const source = ts.transpileModule(readFileSync('src/server/mobileInvitationPreviewToken.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(source, { exports, Buffer, Date, process: { env: { NODE_ENV: 'test' } },
  require: (name: string) => name === 'node:crypto' ? crypto : {} });
const issued = exports.issueInvitationPreviewToken('page-a', 'session-a', Math.floor(Date.now() / 1000) + 86400);
assert.ok(issued.expiresAt <= Math.floor(Date.now() / 1000) + 900);
assert.equal(exports.verifyInvitationPreviewToken(issued.token, 'page-a')?.sessionId, 'session-a');
assert.equal(exports.verifyInvitationPreviewToken(issued.token, 'page-b'), null);
assert.equal(exports.verifyInvitationPreviewToken(issued.token + '.extra', 'page-a'), null);
assert.equal(exports.verifyInvitationPreviewToken(issued.token + 'x', 'page-a'), null);
const expired = exports.issueInvitationPreviewToken('page-a', 'session-a', 1);
assert.equal(exports.verifyInvitationPreviewToken(expired.token, 'page-a'), null);
const payload = issued.token.split('.')[0];
const editSignature = crypto.createHmac('sha256', 'local-client-editor-session-secret').update(payload).digest('base64url');
assert.equal(exports.verifyInvitationPreviewToken(`${payload}.${editSignature}`, 'page-a'), null, 'Edit credentials must not be accepted as preview tokens');

const routeExports: Record<string, (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>> = {};
let session: Record<string, unknown> | null = { pageSlug: 'page-a', eventId: 'event-a', ownerUid: 'owner-a', expiresAt: new Date(Date.now() + 60000) };
let event = { summary: { eventId: 'event-a', ownerUid: 'owner-a', deletion: null as unknown } };
let pageReads = 0;
const routeSource = ts.transpileModule(readFileSync('src/app/api/mobile/client-editor/pages/[slug]/preview/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(routeSource, { exports: routeExports, Date, Promise,
  require(name: string) {
    if (name === 'next/server') return { NextResponse: Response };
    if (name.includes('mobileInvitationPreviewToken')) return exports;
    if (name.includes('mobileClientEditorSessionRepository')) return { firestoreMobileClientEditorSessionRepository: { findBySessionId: async () => session } };
    if (name.includes('eventRepository')) return { resolveStoredEventBySlug: async () => event };
    if (name.includes('eventDeletionPolicy')) return { isEventDeletionBlockingAccess: (value: unknown) => Boolean(value) };
    if (name.includes('invitationPageServerService')) return { getServerInvitationPageBySlug: async () => { pageReads++; return { published: false, displayPeriodEnabled: true, features: {} }; } };
    return {};
  },
});
const get = () => routeExports.GET(new Request('https://example.test', { headers: { authorization: `Bearer ${issued.token}` } }), { params: Promise.resolve({ slug: 'page-a' }) });
const result = await get();
assert.equal(result.status, 200);
assert.equal(result.headers.get('cache-control'), 'no-store');
const preview = await result.json();
assert.equal(preview.page.published, true);
assert.equal(preview.page.features.showGuestbook, false);
for (const change of [{ revokedAt: new Date() }, { expiresAt: new Date(0) }, { ownerUid: 'other' }, { eventId: 'other' }, { pageSlug: 'other' }]) {
  const original = session;
  session = { ...session, ...change };
  assert.equal((await get()).status, 401);
  session = original;
}
event = { summary: { eventId: 'event-a', ownerUid: 'owner-a', deletion: { status: 'pending' } } };
assert.equal((await get()).status, 401);
assert.equal(pageReads, 1, 'Unauthorized previews must never load private page data');
console.log('private preview signature, expiry, owner, event, revocation and deletion checks passed');
