import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { getAdminMediaLibrary } from '../src/server/adminMediaLibraryService';
import { normalizeEventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos';
import { getMediaAssetUsage } from '../src/lib/mediaAssets';

const slug = 'library-fixture';
const prefix = 'wedding-images/library-fixture/';
const date = new Date('2026-01-01T00:00:00Z');
const files = [
  { name: 'gallery-photo.webp', path: prefix + 'gallery-photo.webp', url: 'token-fixture-original', uploadedAt: date, variant: 'original', compatible: true },
  { name: 'content-gallery-photo.webp', path: prefix + 'content-gallery-photo.webp', url: 'token-fixture-content', uploadedAt: date, variant: 'content', compatible: true },
  { name: 'thumb-gallery-photo.webp', path: prefix + 'thumb-gallery-photo.webp', url: 'token-fixture-thumb', uploadedAt: date, variant: 'thumbnail', compatible: true },
  { name: 'old.gif', path: prefix + 'old.gif', url: 'token-fixture-unsupported', uploadedAt: null, compatible: false },
];
const summary = normalizeEventSummaryRecord('event-fixture', { slug, ownerUid: 'owner-fixture', eventType: 'wedding', status: 'active' })!;
let reads = 0, lists = 0;
const deps = { pilotSlug: slug,
  readRecord: async () => { reads++; return { summary, content: { content: {} }, blocked: false }; },
  list: async () => { lists++; return { files, complete: true }; },
};
assert.deepEqual(await getAdminMediaLibrary('other', deps), { mode: 'legacy' });
assert.equal(reads, 0);
assert.equal(lists, 0);
const result = await getAdminMediaLibrary(slug, deps);
assert.equal(result.mode, 'protected');
if (result.mode !== 'protected') throw new Error('Expected protected inventory');
assert.equal(result.images.length, 2);
assert.equal(result.unsupportedObjects, 1);
const asset = result.images.find(item => item.name === 'content-gallery-photo.webp')!;
assert.equal(asset.url, '/api/public/media/library-fixture/content-gallery-photo.webp/');
assert.equal(asset.originalUrl, '/api/public/media/library-fixture/gallery-photo.webp/');
assert.equal(asset.thumbnailUrl, '/api/public/media/library-fixture/thumb-gallery-photo.webp/');
assert.equal(asset.path, prefix + 'content-gallery-photo.webp');
assert.equal(result.images.find(item => item.name === 'old.gif')?.url, '');
assert.ok(!JSON.stringify(result).includes('token-fixture'));
assert.deepEqual(getMediaAssetUsage(asset, [{ value: 'https://firebasestorage.googleapis.com/v0/b/fixture/o/' + encodeURIComponent(asset.path) + '?alt=media&token=fixture', label: 'stored' }]), ['stored']);
await assert.rejects(getAdminMediaLibrary(slug, { ...deps, list: async () => ({ files, complete: false }) }));
await assert.rejects(getAdminMediaLibrary(slug, { ...deps, list: async () => ({ files: [...files, files[0]], complete: true }) }));
await assert.rejects(getAdminMediaLibrary(slug, { ...deps, list: async () => ({ files: [{ ...files[0], path: 'wedding-images/other/photo.webp' }], complete: true }) }));
await assert.rejects(getAdminMediaLibrary('../other', deps));
await assert.rejects(getAdminMediaLibrary(slug, { ...deps, readRecord: async () => ({ summary, content: {}, blocked: true, deleting: true }) }));
class AuthError extends Error { status = 403; }
let authorized = false, inventoryCalls = 0;
const exports: Record<string, unknown> = {};
runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/pages/[slug]/media/library/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Response, require(name: string) {
  if (name === 'next/server') return { NextResponse: Response };
  if (name === '@/server/adminApiAuth') return { AdminApiAuthError: AuthError, verifyAdminRequest: async () => { if (!authorized) throw new AuthError(); } };
  if (name === '@/server/apiErrorResponse') return { toSafeHttpErrorResponse: (error: AuthError) => Response.json({}, { status: error.status }) };
  if (name === '@/server/mediaAssetService') return { MediaAssetError: class extends Error {} };
  if (name === '@/server/adminMediaLibraryService') return { getAdminMediaLibrary: async () => { inventoryCalls++; return result; } };
  throw new Error('Unexpected dependency ' + name);
} });
const get = exports.GET as (req: Request, ctx: { params: Promise<{ slug: string }> }) => Promise<Response>;
const ctx = { params: Promise.resolve({ slug }) };
assert.equal((await get(new Request('https://example.test'), ctx)).status, 403);
assert.equal(inventoryCalls, 0);
authorized = true;
const response = await get(new Request('https://example.test'), ctx);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store');
assert.ok(!JSON.stringify(await response.json()).includes('token-fixture'));

const clientExports: Record<string, unknown> = {};
let sdkCalls = 0, payload: unknown = result, status = 200;
const storage = { ref: (_storage: unknown, path: string) => ({ fullPath: path }), listAll: async () => { sdkCalls++; return { items: [] }; } };
runInNewContext(ts.transpileModule(readFileSync('src/services/imageService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: clientExports, process: { env: { NEXT_PUBLIC_USE_FIREBASE: 'true' } }, window: {}, Date, setTimeout: () => 0, console, fetch: async (url: string, options: RequestInit) => {
  assert.equal(url, '/api/admin/pages/library-fixture/media/library/');
  assert.equal((options.headers as Record<string,string>).Authorization, 'Bearer fixture-auth');
  assert.equal(options.cache, 'no-store');
  return Response.json(payload, { status });
}, require(name: string) {
  if (name === '@/lib/imageUploadPolicy' || name === '@/utils/imageCompression') return {};
  if (name === '@/services/adminAuth') return { getCurrentFirebaseIdToken: async () => 'fixture-auth' };
  if (name === '@/lib/mediaAssets') return { groupMediaAssetFiles: (items: unknown[]) => items };
  if (name === 'firebase/storage') return storage;
  if (name === '@/lib/firebase') return { storage: {} };
  throw new Error('Unexpected dependency ' + name);
} });
const load = clientExports.getAdminPageImages as (slug: string) => Promise<unknown[]>;
assert.equal((await load(slug)).length, 2);
assert.equal(sdkCalls, 0);
status = 503; payload = { error: 'offline' };
await assert.rejects(load(slug));
assert.equal(sdkCalls, 0, 'Protected list failures must not fall back to token listing');
status = 200; payload = { mode: 'protected', images: [{ ...asset, url: 'https://other.test/image' }] };
await assert.rejects(load(slug));
assert.equal(sdkCalls, 0);
payload = { mode: 'legacy' };
await load(slug);
assert.equal(sdkCalls, 1, 'Only explicit legacy mode can use SDK list');
console.log('Admin protected inventory, authorization, legacy fallback and stable identity checks passed');
