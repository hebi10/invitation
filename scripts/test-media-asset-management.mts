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
