import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {
  buildNativeEditorMediaTarget, readNativeEditorMedia, selectNativeUploadPreviewReference,
} from '../apps/mobile/src/lib/nativeEditorMedia';
import { projectMobileUploadReference } from '../src/server/mobileUploadReferencePolicy';
import { getInvitationMediaGatewayImage } from '../src/server/invitationMediaGatewayService';
import { normalizeEventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos';

const slug = 'native-fixture';
const origin = 'https://invite.msgnote.kr';
const stable = '/api/public/media/native-fixture/photo.png/';
const target = origin + '/api/mobile/client-editor/pages/native-fixture/media/photo.png/';
assert.equal(buildNativeEditorMediaTarget(stable, slug, origin), target);
assert.equal(buildNativeEditorMediaTarget(origin + stable, slug, origin), target);
for (const reference of ['https://other.test' + stable, '//other.test' + stable,
  stable.replace(slug, 'other'), stable + '?token=fixture', stable.slice(0, -1),
  '/api/public/media/native-fixture/..%2Fphoto.png/']) {
  assert.equal(buildNativeEditorMediaTarget(reference, slug, origin), null);
}
for (const base of ['https://other.test', 'http://invite.msgnote.kr', origin + '/redirect',
  'https://user:password@invite.msgnote.kr', origin + '?token=fixture']) {
  assert.equal(buildNativeEditorMediaTarget(stable, slug, base), null);
}
assert.equal(buildNativeEditorMediaTarget(stable, slug, 'http://10.0.2.2:3000'), null);
assert.ok(buildNativeEditorMediaTarget(stable, slug, 'http://10.0.2.2:3000', true));
const png = Uint8Array.from([137,80,78,71,13,10,26,10]);
const input = { reference: stable, slug, baseUrl: origin, token: 'fixture-auth', deviceId: 'fixture-device',
  signal: new AbortController().signal };
let calls = 0;
const fetchImage = async (url: string, init: RequestInit) => {
  calls++;
  assert.equal(url, target);
  assert.equal(init.redirect, 'error');
  assert.equal(init.credentials, 'omit');
  assert.equal(init.cache, 'no-store');
  const headers = new Headers(init.headers);
  assert.equal(headers.get('authorization'), 'Bearer fixture-auth');
  assert.equal(headers.get('x-mobile-device-id'), 'fixture-device');
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Content-Length': String(png.length) } });
};
assert.equal(await readNativeEditorMedia(input, fetchImage), 'data:image/png;base64,' + Buffer.from(png).toString('base64'));
await assert.rejects(readNativeEditorMedia({ ...input, reference: 'https://other.test' + stable }, fetchImage));
await assert.rejects(readNativeEditorMedia({ ...input, baseUrl: 'https://other.test' }, fetchImage));
await assert.rejects(readNativeEditorMedia({ ...input, slug: 'other' }, fetchImage));
assert.equal(calls, 1, 'No credentials may leave the exact authorized native media path.');
for (const response of [new Response(null, { status: 403 }),
  new Response(png, { headers: { 'Content-Type': 'image/png', 'Content-Length': '9' } }),
  new Response(png, { headers: { 'Content-Type': 'image/png', 'Content-Length': '99999999' } }),
  new Response(png, { headers: { 'Content-Type': 'text/html', 'Content-Length': '8' } }),
  new Response(Uint8Array.from([1,2,3]), { headers: { 'Content-Type': 'image/png', 'Content-Length': '3' } })]) {
  await assert.rejects(readNativeEditorMedia(input, async () => response));
}
const aborted = new AbortController(); aborted.abort();
await assert.rejects(readNativeEditorMedia({ ...input, signal: aborted.signal }, fetchImage));
assert.equal(calls, 1);

const storagePrefix = 'wedding-images/native-fixture/';
const legacy = { name: 'photo.png', url: 'legacy-content', path: storagePrefix + 'photo.png',
  originalUrl: 'legacy-original', originalPath: storagePrefix + 'original.png',
  thumbnailUrl: 'legacy-thumb', thumbnailPath: storagePrefix + 'thumb.png', uploadedAt: '2026-11-24T00:00:00Z' };
const contract = { slug, requestedVersion: 'stable-v1', ownerBound: true };
const policy = { pilotSlug: slug, enabled: true };
for (const [request, flags] of [
  [{ ...contract, requestedVersion: null }, policy],
  [{ ...contract, ownerBound: false }, policy],
  [contract, { ...policy, enabled: false }],
  [contract, { ...policy, pilotSlug: 'other' }],
] as const) assert.equal(projectMobileUploadReference(legacy, request, flags), legacy);
const projected = projectMobileUploadReference(legacy, contract, policy);
assert.equal(projected.url, stable);
assert.equal(projected.thumbnailUrl, '/api/public/media/native-fixture/thumb.png/');
assert.equal(projected.path, legacy.path);
assert.equal(legacy.url, 'legacy-content');
assert.throws(() => projectMobileUploadReference({ ...legacy, path: 'wedding-images/other/photo.png' }, contract, policy));
assert.equal(selectNativeUploadPreviewReference({ url: projected.url, previewUrl: projected.thumbnailUrl }, 'file://preview', slug), projected.thumbnailUrl);
assert.equal(selectNativeUploadPreviewReference({ url: projected.url, previewUrl: 'https://other.test/preview' }, 'file://preview', slug), projected.url);
assert.equal(selectNativeUploadPreviewReference({ url: legacy.url, previewUrl: legacy.thumbnailUrl }, 'file://preview', slug), 'file://preview');

const summary = normalizeEventSummaryRecord('event-fixture', { slug, ownerUid: 'owner-fixture', status: 'active', published: false })!;
let imageReads = 0;
const deps = { pilotSlug: slug, bucketName: 'fixture-bucket',
  readRecord: async () => ({ summary, content: { content: { metadata: { images: { wedding: '' } } } }, blocked: false }),
  readImage: async () => { imageReads++; return { bytes: png, contentType: 'image/png' }; },
};
await assert.rejects(getInvitationMediaGatewayImage(slug, 'photo.png', { kind: 'public' }, deps));
await assert.rejects(getInvitationMediaGatewayImage(slug, 'photo.png', { kind: 'editor-owner', uid: 'other', eventId: 'event-fixture' }, deps));
await assert.rejects(getInvitationMediaGatewayImage(slug, 'photo.png', { kind: 'editor-owner', uid: 'owner-fixture', eventId: 'other' }, deps));
await assert.rejects(getInvitationMediaGatewayImage(slug, 'photo.png', { kind: 'preview-owner', uid: 'owner-fixture', eventId: 'event-fixture' }, deps));
assert.equal(imageReads, 0);
assert.equal((await getInvitationMediaGatewayImage(slug, 'photo.png', { kind: 'editor-owner', uid: 'owner-fixture', eventId: 'event-fixture' }, deps)).contentType, 'image/png');

let allowed = false;
let changed = false;
let authCalls = 0;
let downloads = 0;
const route = 'src/app/api/mobile/client-editor/pages/[slug]/media/[file]/route.ts';
const exports: Record<string, unknown> = {};
runInNewContext(ts.transpileModule(readFileSync(route, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports, Response,
  require(name: string) {
    if (name === '@/server/clientEditorMobileApi') return { authorizeMobileClientEditorRequest: async () => {
      authCalls++;
      return allowed ? { permissions: { canViewDashboard: true, canEditInvitation: true },
        mobileSession: { sessionId: changed && authCalls % 2 === 0 ? 'other-session' : 'fixture-session',
          ownerUid: 'owner-fixture', eventId: 'event-fixture', pageSlug: slug, scopes: ['canViewDashboard','canEditInvitation'] } } : null;
    } };
    if (name === '@/server/invitationMediaGatewayService') return {
      getInvitationMediaGatewayImage: async () => { downloads++; return { bytes: png, contentType: 'image/png' }; },
      invitationMediaGatewayResponse: () => new Response(png, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }),
      invitationMediaGatewayError: () => Response.json({}, { status: 503 }),
    };
    throw new Error('Unexpected dependency ' + name);
  },
});
const get = exports.GET as (request: Request, context: { params: Promise<{slug:string;file:string}> }) => Promise<Response>;
const req = new Request(target);
const ctx = { params: Promise.resolve({ slug, file: 'photo.png' }) };
assert.equal((await get(req, ctx)).status, 403);
assert.equal(downloads, 0);
allowed = true; authCalls = 0;
assert.equal((await get(req, ctx)).status, 200);
assert.equal(downloads, 1);
changed = true; authCalls = 0;
assert.equal((await get(req, ctx)).status, 403, 'A changed session cannot receive the image.');
assert.equal(downloads, 2);
assert.match(readFileSync('apps/mobile/src/components/ProtectedEditorImage.tsx','utf8'), /cachePolicy="none"/);
assert.match(readFileSync('apps/mobile/src/lib/apiImages.ts','utf8'), /mediaVersion=stable-v1/);
assert.match(readFileSync('apps/mobile/src/features/manage/hooks/useImageUpload.ts','utf8'), /selectNativeUploadPreviewReference/);
console.log('Native protected editor media, upload opt-in compatibility and authorization checks passed');
