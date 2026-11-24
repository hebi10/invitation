import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { buildMediaMigrationPreflight, getServerMediaMigrationPreflight } from '../src/server/mediaMigrationPreflightService';
import { collectMediaUsageReferences, getMediaAssetUsage } from '../src/lib/mediaAssets';

const slug = 'test-page';
const bucketName = 'fixture-bucket';
const prefix = 'wedding-images/test-page/';
const legacy = 'https://firebasestorage.googleapis.com/v0/b/fixture-bucket/o/wedding-images%2Ftest-page%2Fphoto.png?alt=media&token=fixture-only';
const stable = '/api/public/media/test-page/thumbnail.webp/';
const content = { content: { metadata: { images: { wedding: legacy, social: stable } },
  pageData: { galleryImages: [legacy], themeOverrides: { romantic: { galleryImages: ['wedding-images/test-page/missing.png'] } } },
  privateNote: legacy, unrelated: 'https://example.test/static.png' } };
const fixture = {
  slug, bucketName, pilotSlug: '', content,
  memory: { image: legacy },
  wedding: { complete: true, objects: [
    { path: prefix + 'photo.png', tokenPresent: true, noStore: true, variant: 'content', gatewayCompatible: true },
    { path: prefix + 'thumbnail.webp', tokenPresent: false, noStore: true, variant: 'thumbnail', gatewayCompatible: false },
    { path: prefix + 'unused.png', tokenPresent: true, noStore: false, variant: 'original', gatewayCompatible: true },
  ] },
  memoryImages: { complete: true, objects: [] },
  eventType: 'wedding', unavailable: false,
};
const original = JSON.stringify(fixture);
const result = buildMediaMigrationPreflight(fixture);
assert.equal(result.revocationAllowed, false);
assert.equal(result.inventoryComplete, true);
assert.equal(result.candidateFiles, 3);
assert.equal(result.compatibleCandidateFiles, 1);
assert.equal(result.legacyTokenReferences, 2);
assert.equal(result.unmappedStoredReferences, 1, 'Duplicate URL in a non-image field remains a separate blocker');
assert.equal(result.missingOrUnscannedObjects, 1);
assert.equal(result.incompatibleObjects, 1);
assert.equal(result.unreferencedTokenObjects, 1);
assert.equal(result.memoryReferences, 1);
assert.ok(result.blockers.includes('pilot-disabled'));
assert.ok(result.blockers.includes('memory-page-review-required'));
assert.ok(result.blockers.includes('legacy-token-reference'));
assert.ok(!JSON.stringify(result).includes('fixture-only'));
assert.ok(!JSON.stringify(result).includes('photo.png'));
assert.equal(JSON.stringify(fixture), original);
const clean = buildMediaMigrationPreflight({
  ...fixture, pilotSlug: slug, memory: null,
  content: { metadata: { images: { wedding: stable } } },
  wedding: { complete: true, objects: [{ ...fixture.wedding.objects[1], gatewayCompatible: true }] },
});
assert.equal(clean.compatibleCandidateFiles, 1);
assert.equal(clean.revocationAllowed, false, 'Local matching cannot authorize token revocation');
assert.deepEqual(clean.blockers, ['editor-upload-client-cutover-required', 'cross-event-reference-review-required', 'live-compatibility-and-revocation-approval-required']);
const unsupported = buildMediaMigrationPreflight({
  ...fixture, content: { metadata: { images: { wedding: legacy.replace('fixture-bucket', 'other-bucket') } } },
});
assert.equal(unsupported.unsupportedImageReferences, 1);
const partial = buildMediaMigrationPreflight({ ...fixture, wedding: { ...fixture.wedding, complete: false } });
assert.equal(partial.inventoryComplete, false);
assert.ok(partial.blockers.includes('partial-inventory'));
assert.throws(() => buildMediaMigrationPreflight({
  ...fixture, wedding: { complete: true, objects: [{ ...fixture.wedding.objects[0], path: 'wedding-images/other/photo.png' }] },
}));
let deep: unknown = 'wedding-images/test-page/photo.png';
for (let index = 0; index < 40; index++) deep = { deep };
assert.equal(buildMediaMigrationPreflight({ ...fixture, content: deep }).inventoryComplete, false);

const asset = { name: 'thumbnail.webp', path: prefix + 'thumbnail.webp', url: '', uploadedAt: null };
for (const url of [stable, 'https://invite.msgnote.kr' + stable]) {
  assert.deepEqual(getMediaAssetUsage(asset, collectMediaUsageReferences({ metadata: { images: { wedding: url } } }, null)), ['대표 이미지'],
    'A stable gateway reference must prevent referenced image deletion');
}
for (const url of ['https://other.test' + stable, stable.replace('test-page', 'other-page'),
  '/api/public/media/test-page/..%2Fthumbnail.webp/']) {
  assert.deepEqual(getMediaAssetUsage(asset, collectMediaUsageReferences({ metadata: { images: { wedding: url } } }, null)), []);
}

let reads = 0;
const deps = {
  bucketName, pilotSlug: slug,
  readRecord: async () => { reads++; return null; },
  readMemory: async () => { throw new Error('must not read memory'); },
  list: async () => { throw new Error('must not list storage'); },
};
await assert.rejects(getServerMediaMigrationPreflight('../other', deps), (error: { status?: number }) => error.status === 400);
assert.equal(reads, 0);
await assert.rejects(getServerMediaMigrationPreflight(slug, deps), (error: { status?: number }) => error.status === 404);
assert.equal(reads, 1);

class AuthError extends Error { status = 401; }
let authorized = false;
let inspected = 0;
const routeExports: Record<string, unknown> = {};
runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/pages/[slug]/media/migration/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: routeExports, Response,
  require(name: string) {
    if (name === 'next/server') return { NextResponse: Response };
    if (name === '@/server/adminApiAuth') return {
      AdminApiAuthError: AuthError, verifyAdminRequest: async () => { if (!authorized) throw new AuthError(); },
    };
    if (name === '@/server/apiErrorResponse') return { toSafeHttpErrorResponse: (error: AuthError) => Response.json({}, { status: error.status }) };
    if (name === '@/server/mediaAssetService') return { MediaAssetError: class extends Error {} };
    if (name === '@/server/mediaMigrationPreflightService') return { getServerMediaMigrationPreflight: async () => { inspected++; return result; } };
    throw new Error('Unexpected dependency ' + name);
  },
});
const get = routeExports.GET as (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>;
const request = new Request('https://example.test');
const context = { params: Promise.resolve({ slug }) };
assert.equal((await get(request, context)).status, 401);
assert.equal(inspected, 0);
authorized = true;
const response = await get(request, context);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store');
assert.equal((await response.json()).revocationAllowed, false);
assert.equal(inspected, 1);
console.log('Media migration preflight, reference identity, read-only access and fail-closed checks passed');
