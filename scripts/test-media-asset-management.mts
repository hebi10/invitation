import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const knownCreatedAt = '2025-04-03T12:00:00.000Z';

async function listFixture(names: string[], metadataAvailable = true) {
  const exports: Record<string, unknown> = {};
  const files = names.map((name) => ({ name, fullPath: `wedding-images/test-page/${name}` }));
  const storage = {
    ref: (_storage: unknown, fullPath: string) => ({ fullPath }),
    listAll: async () => ({ items: files, prefixes: [] }),
    getDownloadURL: async (file: { fullPath: string }) => `https://images.test/${file.fullPath}`,
    getMetadata: async (file: { name: string }) => {
      if (!metadataAvailable) throw new Error('metadata unavailable');
      return {
      timeCreated: knownCreatedAt,
      customMetadata: { variant: file.name.startsWith('original-') ? 'original' : file.name.startsWith('thumb-') ? 'thumbnail' : file.name.startsWith('content-') ? 'content' : undefined },
      };
    },
  };
  runInNewContext(ts.transpileModule(readFileSync('src/services/imageService.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, window: {}, process: { env: { NEXT_PUBLIC_USE_FIREBASE: 'true' } },
    console, setTimeout: () => 0,
    require: (name: string) => {
      if (name === 'firebase/storage') return storage;
      if (name === '@/lib/firebase') return { storage: {} };
      if (name === '@/lib/mediaAssets') return mediaAssetModule;
      return {};
    },
  });
  const getImages = exports.getImagesByPage as (slug: string) => Promise<Array<{
    path: string; originalPath?: string; thumbnailPath?: string; uploadedAt: Date | null;
  }>>;
  return getImages('test-page');
}

// Firebase 네트워크만 대체하고 실제 서비스의 그룹화·날짜 동작을 검증합니다.
let mediaAssetModule: Record<string, unknown> = {};
try { mediaAssetModule = await import('../src/lib/mediaAssets'); } catch { /* Existing implementation has no grouping helper. */ }

const legacy = await listFixture(['photo.webp', 'original-photo.webp', 'thumb-photo.webp']);
assert.equal(legacy.length, 1, 'Original, content and thumbnail must represent one logical photo');
assert.equal(legacy[0].path, 'wedding-images/test-page/photo.webp');
assert.equal(legacy[0].originalPath, 'wedding-images/test-page/original-photo.webp');
assert.equal(legacy[0].thumbnailPath, 'wedding-images/test-page/thumb-photo.webp');
assert.equal(legacy[0].uploadedAt?.toISOString(), knownCreatedAt, 'Listing must retain Storage creation time');
assert.equal((await listFixture(['photo.webp'], false))[0].uploadedAt, null, 'Metadata lookup failure must never be replaced with the listing date');

const optimized = await listFixture(['gallery-123.webp', 'content-gallery-123.webp', 'thumb-gallery-123.webp']);
assert.equal(optimized.length, 1, 'Server optimized image variants must be grouped');
assert.equal(optimized[0].path, 'wedding-images/test-page/content-gallery-123.webp');
assert.equal(optimized[0].originalPath, 'wedding-images/test-page/gallery-123.webp');
assert.equal(optimized[0].thumbnailPath, 'wedding-images/test-page/thumb-gallery-123.webp');

const { collectMediaUsageReferences, getMediaAssetUsage, groupMediaAssetFiles } = await import('../src/lib/mediaAssets');
const asset = {
  name: 'photo.webp', path: 'wedding-images/test-page/photo.webp', url: 'https://images.test/wedding-images/test-page/photo.webp',
  originalPath: 'wedding-images/test-page/original-photo.webp',
  thumbnailPath: 'wedding-images/test-page/thumb-photo.webp', uploadedAt: null,
};
const references = collectMediaUsageReferences({
  metadata: { images: { wedding: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/wedding-images%2Ftest-page%2Fphoto.webp?alt=media&token=old' } },
  pageData: { themeOverrides: { gyeol: { galleryImageThumbnailUrls: ['wedding-images/test-page/thumb-photo.webp'] } } },
}, { heroImage: { path: 'wedding-images/test-page/original-photo.webp' } });
assert.deepEqual(getMediaAssetUsage(asset, references), ['대표 이미지', '갤러리 (gyeol)', '추억 페이지 대표 이미지']);
assert.deepEqual(getMediaAssetUsage(asset, collectMediaUsageReferences({ metadata: { images: { wedding: 'wedding-images/other-page/photo.webp' } } }, null)), []);
assert.equal(groupMediaAssetFiles([{ ...asset, uploadedAt: null }])[0].uploadedAt, null, 'Missing creation time must stay unknown');
const reservedFileNameAssets = groupMediaAssetFiles([
  { name: 'photo.webp', path: 'wedding-images/test-page/photo.webp', url: '', uploadedAt: null, variant: 'content' },
  { name: 'original-photo.webp', path: 'wedding-images/test-page/original-photo.webp', url: '', uploadedAt: null, variant: 'content' },
  { name: 'original-original-photo.webp', path: 'wedding-images/test-page/original-original-photo.webp', url: '', uploadedAt: null, variant: 'original' },
  { name: 'thumb-original-photo.webp', path: 'wedding-images/test-page/thumb-original-photo.webp', url: '', uploadedAt: null, variant: 'thumbnail' },
]);
assert.equal(reservedFileNameAssets.length, 2, 'Explicit content metadata must stop prefix-named files being merged with another photo');
assert.equal(reservedFileNameAssets.find((entry) => entry.path.endsWith('/photo.webp'))?.originalPath, undefined, 'Unrelated explicit content file must never become another asset original');

const { deleteServerMediaAsset } = await import('../src/server/mediaAssetService');
let storedConfig: unknown = { metadata: { images: { social: 'wedding-images/test-page/thumb-photo.webp' } } };
let storedMemory: unknown = null;
const deletedPaths: string[] = [];
const dependencies = {
  loadConfig: async () => ({ config: storedConfig }),
  loadMemory: async () => storedMemory,
  storage: {
    listFiles: async () => ['photo.webp', 'original-photo.webp', 'thumb-photo.webp', 'unrelated.webp'].map((name) => ({ name, path: `wedding-images/test-page/${name}`, url: '', uploadedAt: null })),
    deleteFile: async (path: string) => { deletedPaths.push(path); },
  },
};
await assert.rejects(() => deleteServerMediaAsset('test-page', asset.path, dependencies), (error: { status?: number }) => error.status === 409, 'Saved sharing references must block deletion');
assert.deepEqual(deletedPaths, []);
storedConfig = {};
storedMemory = { galleryImages: [{ path: asset.originalPath }] };
await assert.rejects(() => deleteServerMediaAsset('test-page', asset.path, dependencies), (error: { status?: number }) => error.status === 409, 'Memory references must block deletion');
assert.deepEqual(deletedPaths, []);
storedMemory = null;
await assert.rejects(() => deleteServerMediaAsset('test-page', 'wedding-images/other-page/photo.webp', dependencies), (error: { status?: number }) => error.status === 400);
await assert.rejects(() => deleteServerMediaAsset('test-page', 'wedding-images/test-page/../other.webp', dependencies), (error: { status?: number }) => error.status === 400);
await assert.rejects(() => deleteServerMediaAsset('test-page', asset.path, { ...dependencies, loadMemory: async () => { throw new Error('offline'); } }));
await assert.rejects(() => deleteServerMediaAsset('test-page', asset.path, { ...dependencies, loadConfig: async () => null }), (error: { status?: number }) => error.status === 404);
assert.deepEqual(deletedPaths, [], 'Usage lookup failure must block every Storage deletion');
await deleteServerMediaAsset('test-page', asset.path, dependencies);
assert.deepEqual(deletedPaths.sort(), ['wedding-images/test-page/original-photo.webp', 'wedding-images/test-page/photo.webp', 'wedding-images/test-page/thumb-photo.webp'], 'Deleting one logical asset must include its variants only');

const { AdminApiAuthError, verifyAdminRequest } = await import('../src/server/adminApiAuth');
const routeExports: Record<string, unknown> = {};
const serverMediaModule = await import('../src/server/mediaAssetService');
const jsonResponse = (value: unknown, options: ResponseInit = {}) => new Response(JSON.stringify(value), { ...options, headers: { 'Content-Type': 'application/json' } });
runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/pages/[slug]/media/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: routeExports, console,
  require: (name: string) => {
    if (name === 'next/server') return { NextResponse: { json: jsonResponse } };
    if (name === '@/server/adminApiAuth') return {
      AdminApiAuthError,
      verifyAdminRequest: (request: Request) => verifyAdminRequest(request, { auth: { verifyIdToken: async () => ({ uid: 'admin' }) }, isAdminEnabled: async () => true }),
    };
    if (name === '@/server/mediaAssetService') return {
      ...serverMediaModule,
      deleteServerMediaAsset: (slug: string, path: string) => serverMediaModule.deleteServerMediaAsset(slug, path, dependencies),
    };
    if (name === '@/server/apiErrorResponse') return {
      toSafeHttpErrorResponse: (error: { status: number; message: string }) => jsonResponse({ error: error.message }, { status: error.status }),
    };
    return {};
  },
});
const routeDelete = routeExports.DELETE as (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>;
const denied = await routeDelete(new Request('https://local.test/api/admin/pages/test-page/media', { method: 'DELETE', body: JSON.stringify({ path: asset.path }) }), { params: Promise.resolve({ slug: 'test-page' }) });
assert.equal(denied.status, 401, 'Unauthenticated requests must never delete media');
assert.equal(deletedPaths.length, 3, 'An unauthorized request must not reach Storage deletion');
storedConfig = { metadata: { images: { wedding: asset.path } } };
const stillUsed = await routeDelete(new Request('https://local.test/api/admin/pages/test-page/media', { method: 'DELETE', headers: { Authorization: 'Bearer valid' }, body: JSON.stringify({ path: asset.path }) }), { params: Promise.resolve({ slug: 'test-page' }) });
assert.equal(stillUsed.status, 409, 'The API must recheck saved references even when a client claims media is unused');
assert.equal(deletedPaths.length, 3);

console.log('Media grouping, real creation time, persisted reference guards and API auth checks passed');


const { getServerMediaAccessAudit } = await import('../src/server/mediaAccessAuditService');
const auditPrefixes: string[] = [];
const auditDeps = {
  eventExists: async (slug: string) => slug === 'test-page',
  list: async (prefix: string) => {
    auditPrefixes.push(prefix);
    return prefix.startsWith('wedding-images/') ? {
      complete: true,
      objects: [
        { path: prefix + 'private-fixture.webp', tokenPresent: true, noStore: true, variant: 'original' },
        { path: prefix + 'content-fixture.webp', tokenPresent: false, noStore: false, variant: 'content' },
      ],
    } : { complete: false, objects: [] };
  },
};
await assert.rejects(() => getServerMediaAccessAudit('../other', auditDeps), (error: { status?: number }) => error.status === 400);
await assert.rejects(() => getServerMediaAccessAudit('missing', auditDeps), (error: { status?: number }) => error.status === 404);
assert.deepEqual(auditPrefixes, [], 'Invalid or unknown slugs must not list Storage');
const mediaAudit = await getServerMediaAccessAudit('test-page', auditDeps);
assert.deepEqual(auditPrefixes.sort(), ['memory-images/test-page/', 'wedding-images/test-page/']);
assert.equal(mediaAudit.complete, false, 'A partial namespace must never be reported as fully audited');
assert.deepEqual(mediaAudit.results[0], {
  namespace: 'wedding-images', inspectedObjects: 2, tokenObjects: 1, cacheReviewObjects: 1,
  originalTokenObjects: 1, complete: true,
});
assert.ok(!JSON.stringify(mediaAudit).includes('private-fixture.webp'), 'Do not expose object paths or tokens');
await assert.rejects(() => getServerMediaAccessAudit('test-page', {
  ...auditDeps, list: async () => ({ complete: true, objects: [{ path: 'wedding-images/other/photo.webp', tokenPresent: true, noStore: false, variant: null }] }),
}), (error: { status?: number }) => error.status === 503);
await assert.rejects(() => getServerMediaAccessAudit('test-page', {
  ...auditDeps, list: async () => { throw new Error('Storage unavailable'); },
}), /Storage unavailable/);
assert.match(readFileSync('src/app/api/admin/pages/[slug]/media/security/route.ts', 'utf8'), /await verifyAdminRequest\(request\)[\s\S]*await getServerMediaAccessAudit\(slug\)/);


const { getInvitationMediaGatewayImage, buildInvitationMediaGatewayUrl, invitationMediaGatewayResponse } =
  await import('../src/server/invitationMediaGatewayService');
const { normalizeEventSummaryRecord } = await import('../src/server/repositories/eventReadThroughDtos');
const sampleImagePath = 'wedding-images/test-page/photo.png';
const gatewayUrl = buildInvitationMediaGatewayUrl('test-page', 'photo.png');
assert.equal(gatewayUrl, '/api/public/media/test-page/photo.png/');
const gatewaySummary = normalizeEventSummaryRecord('gateway-event', {
  slug: 'test-page', ownerUid: 'owner-fixture', status: 'active', visibility: { published: true },
});
assert.ok(gatewaySummary);
const publicReference = { pageData: { galleryImages: ['https://firebasestorage.googleapis.com/v0/b/test-bucket/o/wedding-images%2Ftest-page%2Fphoto.png?alt=media&token=fixture'] } };
let gatewayRecord = { summary: gatewaySummary, content: publicReference as unknown, blocked: false };
let gatewayReads = 0;
const gatewayDeps = {
  pilotSlug: 'test-page',
  bucketName: 'test-bucket',
  readRecord: async () => gatewayRecord,
  readImage: async (path: string) => {
    gatewayReads++;
    assert.equal(path, sampleImagePath);
    return { bytes: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), contentType: 'image/png' };
  },
};
const gatewayDenied = (error: { status?: number }) => error.status === 404;
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, { ...gatewayDeps, pilotSlug: '' }), gatewayDenied);
await assert.rejects(getInvitationMediaGatewayImage('test-page', '../photo.png', { kind: 'public' }, gatewayDeps), gatewayDenied);
await assert.rejects(getInvitationMediaGatewayImage('other-page', 'photo.png', { kind: 'public' }, gatewayDeps), gatewayDenied);
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'owner', uid: 'foreign' }, gatewayDeps), gatewayDenied);
for (const content of [
  {}, { pageData: { galleryImages: ['https://example.test/o/wedding-images%2Ftest-page%2Fphoto.png'] } },
  { pageData: { galleryImages: ['https://firebasestorage.googleapis.com/v0/b/other-bucket/o/wedding-images%2Ftest-page%2Fphoto.png'] } },
  { pageData: { galleryImages: ['wedding-images/other-page/photo.png'] } },
  { privateNote: publicReference.pageData.galleryImages[0] },
]) {
  gatewayRecord = { ...gatewayRecord, content };
  await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, gatewayDeps), gatewayDenied);
}
gatewayRecord = { summary: { ...gatewaySummary, published: false, visibility: { ...gatewaySummary.visibility!, published: false } }, content: publicReference, blocked: false };
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, gatewayDeps), gatewayDenied);
gatewayRecord = { summary: { ...gatewaySummary, displayPeriod: { isActive: true, startDate: new Date('2000-01-01'), endDate: new Date('2000-02-01') } }, content: publicReference, blocked: false };
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, gatewayDeps), gatewayDenied);
gatewayRecord = { summary: gatewaySummary, content: publicReference, blocked: true };
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, gatewayDeps), gatewayDenied);
assert.equal(gatewayReads, 0, 'Denied requests never read image bytes');
await getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'owner', uid: 'owner-fixture' }, gatewayDeps);
gatewayRecord = { summary: gatewaySummary, content: { content: { pageData: { galleryImages: [gatewayUrl] } } }, blocked: false };
const mediaResponse = invitationMediaGatewayResponse(await getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, gatewayDeps));
assert.equal(mediaResponse.headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal(mediaResponse.headers.get('x-content-type-options'), 'nosniff');
assert.equal(mediaResponse.headers.get('content-type'), 'image/png');
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, {
  ...gatewayDeps, readImage: async () => ({ bytes: Uint8Array.from([60, 62]), contentType: 'image/png' }),
}), gatewayDenied);
let raceReads = 0;
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'public' }, {
  ...gatewayDeps, readRecord: async () => ({ ...gatewayRecord, blocked: ++raceReads > 1 }),
}), gatewayDenied, 'A concurrent access-state change must block the response');


const { projectPilotPublicInvitationMedia, collectPublicInvitationImageReferences } = await import('../src/server/invitationMediaProjection');
const { createInvitationPageFromSeed } = await import('../src/config/weddingPages');
const { shinMinjeKimHyunjiConfig } = await import('../src/config/pages/shin-minje-kim-hyunji');
const { getEventInvitationMetadata } = await import('../src/app/_components/EventInvitationLayout');
const { buildMobileInvitationShareModel } = await import('../src/app/mobile-share/shareModel');
const pilotPage = { ...createInvitationPageFromSeed(shinMinjeKimHyunjiConfig), slug: 'test-page', published: true,
  displayPeriodEnabled: false, displayPeriodStart: null, displayPeriodEnd: null };
const tokenImage = publicReference.pageData.galleryImages[0];
const thumbnail = 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/wedding-images%2Ftest-page%2Fthumb-photo.webp?alt=media&token=fixture-thumb';
pilotPage.metadata = { ...pilotPage.metadata, images: { wedding: tokenImage, favicon: '/favicon.ico', social: tokenImage, kakaoCard: tokenImage } };
pilotPage.pageData = { ...pilotPage.pageData, coverImageThumbnailUrl: thumbnail, galleryImages: [tokenImage, '/images/public-example.webp'],
  galleryImageThumbnailUrls: [thumbnail, '/images/public-example.webp'],
  themeOverrides: { romantic: { galleryImages: [tokenImage], galleryImageThumbnailUrls: [thumbnail] } } };
const projectDeps = { pilotSlug: 'test-page', bucketName: 'test-bucket' };
const projected = projectPilotPublicInvitationMedia(pilotPage, 'test-page', projectDeps);
assert.ok(projected);
assert.equal(projected.metadata.images.wedding, gatewayUrl);
assert.equal(projected.metadata.images.social, gatewayUrl);
assert.equal(projected.metadata.images.kakaoCard, gatewayUrl);
assert.equal(projected.metadata.images.favicon, '/favicon.ico');
assert.deepEqual(projected.pageData?.galleryImages, [gatewayUrl, '/images/public-example.webp']);
assert.equal(projected.pageData?.coverImageThumbnailUrl, '/api/public/media/test-page/thumb-photo.webp/');
assert.equal(projected.pageData?.themeOverrides?.romantic?.galleryImages?.[0], gatewayUrl);
assert.equal(pilotPage.metadata.images.wedding, tokenImage, 'Projection never mutates saved/editor input');
assert.equal(pilotPage.pageData?.themeOverrides?.romantic?.galleryImages?.[0], tokenImage);
assert.equal(projectPilotPublicInvitationMedia(pilotPage, 'test-page', { ...projectDeps, pilotSlug: '' }), pilotPage);
assert.equal(projectPilotPublicInvitationMedia(pilotPage, 'other-page', projectDeps), pilotPage);
assert.throws(() => projectPilotPublicInvitationMedia(pilotPage, 'test-page', { ...projectDeps, bucketName: '' }), /not configured/);
assert.ok(!JSON.stringify(projected).includes('token=fixture'));
const shareModel = buildMobileInvitationShareModel(projected, 'simple');
assert.equal(shareModel?.imageUrl, gatewayUrl);
assert.ok(JSON.stringify(getEventInvitationMetadata(projected)).includes(gatewayUrl));
assert.deepEqual(collectPublicInvitationImageReferences({ content: { metadata: { images: { wedding: tokenImage } }, privateNote: 'hidden-image' } }), [tokenImage]);
const badSource = { ...pilotPage, metadata: { ...pilotPage.metadata, images: {
  ...pilotPage.metadata.images, wedding: tokenImage.replace('test-bucket', 'foreign-bucket'),
} } };
assert.equal(projectPilotPublicInvitationMedia(badSource, 'test-page', projectDeps)?.metadata.images.wedding, '');
console.log('Pilot public projection, sharing metadata, and explicit image references checked');


const previewMedia = await import('../src/lib/invitationPreviewMedia');
const { projectPilotPrivateInvitationMedia } = await import('../src/server/invitationMediaProjection');
const privatePilotPage = projectPilotPrivateInvitationMedia(pilotPage, 'test-page', 'customer', projectDeps);
const protectedImage = '/api/customer/events/test-page/media/photo.png/';
assert.equal(privatePilotPage.metadata.images.wedding, protectedImage);
assert.equal(privatePilotPage.metadata.images.social, protectedImage);
assert.ok(!JSON.stringify(privatePilotPage).includes('token=fixture'));
assert.equal(pilotPage.metadata.images.wedding, tokenImage);
assert.equal(projectPilotPrivateInvitationMedia(pilotPage, 'test-page', 'customer', { ...projectDeps, pilotSlug: '' }), pilotPage);
const mobileMedia = previewMedia.buildInvitationPreviewMediaUrl('test-page', 'photo.png', 'mobile');
assert.equal(mobileMedia, '/api/mobile/client-editor/pages/test-page/preview/?media=photo.png');
for (const invalid of [
  'https://example.test' + protectedImage, '//example.test' + protectedImage,
  '/api/customer/events/other/media/photo.png/', '/api/customer/events/test-page/media/..%2Fphoto.png/',
  protectedImage + '?token=hidden', protectedImage + '#fragment', protectedImage.slice(0, -1),
]) assert.equal(previewMedia.isInvitationPreviewMediaUrl(invalid, 'test-page', 'customer'), false);
assert.equal(previewMedia.isInvitationPreviewMediaUrl(protectedImage, 'test-page', 'customer'), true);
assert.equal(previewMedia.isInvitationPreviewMediaUrl(mobileMedia, 'test-page', 'mobile'), true);
const requestedMedia: string[] = [];
const revokedMedia: string[] = [];
let createdMedia = 0;
let failPreviewMedia = false;
const mediaDependencies = {
  fetchImage: async (url: string, options: RequestInit) => {
    requestedMedia.push(url);
    assert.ok(previewMedia.isInvitationPreviewMediaUrl(url, 'test-page', 'customer'));
    assert.equal((options.headers as Record<string, string>).Authorization, 'Bearer fixture-auth');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    if (failPreviewMedia && url.includes('thumb-photo')) return new Response(null, { status: 403 });
    return new Response(Uint8Array.from([1,2,3]), { headers: { 'Content-Type': 'image/png' } });
  },
  createObjectUrl: () => 'blob:preview-' + (++createdMedia),
  revokeObjectUrl: (url: string) => { revokedMedia.push(url); },
};
const localMedia = await previewMedia.materializeInvitationPreviewMedia(privatePilotPage, 'test-page', 'customer', 'fixture-auth',
  new AbortController().signal, mediaDependencies);
assert.equal(requestedMedia.length, 2, 'Repeated image references must be downloaded only once.');
assert.match(localMedia.page.metadata.images.wedding, /^blob:preview-/);
assert.equal(localMedia.page.metadata.images.wedding, localMedia.page.metadata.images.social);
assert.equal(localMedia.page.pageData?.galleryImages?.[1], '/images/public-example.webp');
localMedia.dispose();
localMedia.dispose();
assert.equal(revokedMedia.length, 2, 'Disposal is idempotent.');
failPreviewMedia = true;
await assert.rejects(previewMedia.materializeInvitationPreviewMedia(privatePilotPage, 'test-page', 'customer', 'fixture-auth',
  new AbortController().signal, mediaDependencies));
assert.equal(revokedMedia.length, 3, 'A partial failure revokes successfully downloaded image bytes.');
const stopped = new AbortController();
stopped.abort();
const previousRequests = requestedMedia.length;
await assert.rejects(previewMedia.materializeInvitationPreviewMedia(privatePilotPage, 'test-page', 'customer', 'fixture-auth', stopped.signal, mediaDependencies));
assert.equal(requestedMedia.length, previousRequests, 'Aborted previews never start a new request.');
gatewayRecord = { summary: gatewaySummary, content: { pageData: { galleryImages: [gatewayUrl] } }, blocked: false };
await getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'preview-owner', uid: 'owner-fixture', eventId: gatewaySummary.eventId }, gatewayDeps);
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'preview-owner', uid: 'owner-fixture', eventId: 'other-event' }, gatewayDeps), gatewayDenied);
await assert.rejects(getInvitationMediaGatewayImage('test-page', 'photo.png', { kind: 'owner', uid: 'owner-fixture' }, {
  ...gatewayDeps, readRecord: async () => ({ ...gatewayRecord, deleting: true }),
}), gatewayDenied, 'Deletion must also block authenticated image reads.');
console.log('Protected preview media projection, bearer transport, cleanup and owner-bound access checks passed');
