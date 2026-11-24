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
let session: Record<string, unknown> | null = { pageSlug: 'page-a', eventId: 'event-a', ownerUid: 'owner-a', expiresAt: new Date(Date.now() + 60000), scopes: ['canViewDashboard'] };
let event = { summary: { eventId: 'event-a', ownerUid: 'owner-a', deletion: null as unknown } };
let pageReads = 0;
let imageReads = 0;
let revokeDuringRead = false;
const projection = await import('../src/server/invitationMediaProjection');
const gateway = await import('../src/server/invitationMediaGatewayService');
let pilotSlug = '';
const legacyImage = 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/wedding-images%2Fpage-a%2Fphoto.png?alt=media&token=preview-fixture';
const persisted = { slug: 'page-a', eventType: 'wedding', published: false, displayPeriodEnabled: true,
  features: {}, metadata: { images: { wedding: legacyImage } } } as unknown as import('../src/types/invitationPage').InvitationPage;
const routeSource = ts.transpileModule(readFileSync('src/app/api/mobile/client-editor/pages/[slug]/preview/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(routeSource, { exports: routeExports, Date, Promise, URL,
  require(name: string) {
    if (name === 'next/server') return { NextResponse: Response };
    if (name.includes('mobileInvitationPreviewToken')) return exports;
    if (name.includes('mobileClientEditorSessionRepository')) return { firestoreMobileClientEditorSessionRepository: { findBySessionId: async () => session } };
    if (name.includes('eventRepository')) return { resolveStoredEventBySlug: async () => event };
    if (name.includes('eventDeletionPolicy')) return { isEventDeletionBlockingAccess: (value: unknown) => Boolean(value) };
    if (name.includes('invitationPageServerService')) return { getServerInvitationPageBySlug: async () => { pageReads++; return persisted; } };
    if (name.includes('invitationMediaProjection')) return { projectPilotPrivateInvitationMedia: (page: typeof persisted, slug: string, mode: 'mobile') =>
      projection.projectPilotPrivateInvitationMedia(page, slug, mode, { pilotSlug, bucketName: 'test-bucket' }) };
    if (name.includes('invitationMediaGatewayService')) return {
      invitationMediaGatewayResponse: gateway.invitationMediaGatewayResponse,
      invitationMediaGatewayError: gateway.invitationMediaGatewayError,
      getInvitationMediaGatewayImage: async (slug: string, file: string, reader: { kind: string; uid: string; eventId: string }) => {
        assert.equal(slug, 'page-a'); assert.equal(file, 'photo.png');
        assert.equal(JSON.stringify(reader), JSON.stringify({ kind: 'preview-owner', uid: 'owner-a', eventId: 'event-a' }));
        imageReads++;
        if (revokeDuringRead) session = { ...session, revokedAt: new Date() };
        return { contentType: 'image/png', bytes: Uint8Array.from([137,80,78,71,13,10,26,10]) };
      },
    };
    return {};
  },
});
const get = (query = '') => routeExports.GET(new Request('https://example.test/' + query, { headers: { authorization: `Bearer ${issued.token}` } }), { params: Promise.resolve({ slug: 'page-a' }) });
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

event = { summary: { eventId: 'event-a', ownerUid: 'owner-a', deletion: null } };
pilotSlug = 'page-a';
const protectedPage = await (await get()).json();
assert.equal(protectedPage.page.metadata.images.wedding, '/api/mobile/client-editor/pages/page-a/preview/?media=photo.png');
assert.ok(!JSON.stringify(protectedPage).includes('preview-fixture'));
assert.equal(persisted.metadata.images.wedding, legacyImage);
const imageResponse = await get('?media=photo.png');
assert.equal(imageResponse.status, 200);
assert.equal(imageResponse.headers.get('content-type'), 'image/png');
assert.equal(imageResponse.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal(imageResponse.headers.get('referrer-policy'), 'no-referrer');
for (const change of [{ ownerUid: null }, { eventId: null }, { scopes: [] }]) {
  const original = session;
  session = { ...session, ...change };
  assert.equal((await get('?media=photo.png')).status, 403);
  session = original;
}
assert.equal((await get('?media=photo.png&media=other.png')).status, 403);
assert.equal(imageReads, 1, 'Unauthorized or ambiguous requests must not read image bytes');
revokeDuringRead = true;
assert.equal((await get('?media=photo.png')).status, 401, 'A revoked session during the download must not return image bytes');
assert.equal(imageReads, 2);
console.log('owner-bound mobile preview media and revocation checks passed');
