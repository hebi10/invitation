import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanupMobileStagedImages } from '../src/server/mobileUploadCleanupService';
import { getMobileUploadVariantPaths, hashMobileUploadEditorSession } from '../src/server/mobileUploadCleanupPolicy';
import { normalizeEventSummaryRecord } from '../src/server/repositories/eventReadThroughDtos';

const slug = 'cleanup-fixture';
const eventId = 'event-cleanup';
const ownerUid = 'owner-fixture';
const sessionId = 'mobile-session-fixture';
const prefix = 'wedding-images/cleanup-fixture/';
const name = 'gallery-photo-1760000000000-abc123.webp';
const paths = [prefix + name, prefix + 'content-' + name, prefix + 'thumb-' + name];
assert.deepEqual(getMobileUploadVariantPaths(slug, paths[1], 'content'), paths);
assert.equal(getMobileUploadVariantPaths(slug, prefix + '../photo.webp', 'original'), null);
assert.equal(getMobileUploadVariantPaths(slug, prefix + 'foreign.webp', 'original'), null);
assert.notEqual(hashMobileUploadEditorSession(sessionId), sessionId);
const summary = normalizeEventSummaryRecord(eventId, { slug, ownerUid, status: 'active' });
const input = { slug, eventId, ownerUid, sessionId, paths };
const records = paths.map((path, index) => ({
  path, generation: String(index + 100), pageSlug: slug,
  variant: ['original', 'content', 'thumbnail'][index],
  mobileEditorSessionHash: hashMobileUploadEditorSession(sessionId)!,
  uploadSessionId: 'upload-fixture',
}));
let content: unknown = { content: { metadata: { images: { wedding: '' } } } };
let memory: unknown = null;
let deleted: Array<[string, string]> = [];
let reads = 0;
let referencedOnSecondRead = false;
let owner = ownerUid;
const deps = {
  readRecord: async () => {
    reads++;
    return { summary: { ...summary, ownerUid: owner }, content: referencedOnSecondRead && reads % 2 === 0
      ? { content: { pageData: { galleryImages: ['/api/public/media/cleanup-fixture/content-' + name + '/'] } } }
      : content, blocked: false };
  },
  readMemory: async () => memory as Record<string, unknown> | null,
  inspect: async (path: string) => records.find(object => object.path === path) ?? null,
  remove: async (path: string, generation: string) => { deleted.push([path, generation]); },
};
const denied = (error: { status?: number }) => error.status === 409;
await assert.rejects(cleanupMobileStagedImages({ ...input, sessionId: '' }, deps), denied);
await assert.rejects(cleanupMobileStagedImages({ ...input, sessionId: 'other' }, deps), denied);
await assert.rejects(cleanupMobileStagedImages({ ...input, paths: [paths[0]] }, deps), denied);
await assert.rejects(cleanupMobileStagedImages({ ...input, paths: ['wedding-images/other/photo.webp'] }, deps), (error: { status?: number }) => error.status === 400);
for (const value of [
  paths[0],
  '/api/public/media/cleanup-fixture/content-' + name + '/',
  'https://firebasestorage.googleapis.com/v0/b/fixture/o/' + encodeURIComponent(paths[2]) + '?alt=media&token=fixture',
]) {
  content = { content: { metadata: { images: { wedding: value } } } };
  await assert.rejects(cleanupMobileStagedImages(input, deps), denied);
}
content = { content: {} };
memory = { heroImage: { path: paths[2] } };
await assert.rejects(cleanupMobileStagedImages(input, deps), denied);
memory = null;
owner = 'other-owner';
await assert.rejects(cleanupMobileStagedImages(input, deps), denied);
owner = ownerUid;
records[0].mobileEditorSessionHash = '';
await assert.rejects(cleanupMobileStagedImages(input, deps), denied);
records[0].mobileEditorSessionHash = hashMobileUploadEditorSession(sessionId)!;
records[1].uploadSessionId = 'legacy-mobile-upload';
await assert.rejects(cleanupMobileStagedImages(input, deps), denied);
records[1].uploadSessionId = 'upload-fixture';
reads = 0;
referencedOnSecondRead = true;
await assert.rejects(cleanupMobileStagedImages(input, deps), denied);
referencedOnSecondRead = false;
await assert.rejects(cleanupMobileStagedImages(input, { ...deps, readMemory: async () => { throw new Error('offline'); } }));
assert.deepEqual(deleted, [], 'No denied or failed check may delete any object');
const result = await cleanupMobileStagedImages(input, deps);
assert.deepEqual(result.deletedPaths, paths);
assert.deepEqual(deleted, paths.map((path, index) => [path, String(index + 100)]));
deleted = [];
const retry = await cleanupMobileStagedImages(input, { ...deps, inspect: async () => null });
assert.deepEqual(retry.deletedPaths, []);
assert.deepEqual(retry.absentPaths, paths);
assert.deepEqual(deleted, []);
const route = readFileSync('src/app/api/mobile/client-editor/pages/[slug]/images/route.ts', 'utf8');
assert.match(route, /mobileEditorSessionId: access.mobileSession\?\.sessionId/);
assert.match(route, /await cleanupMobileStagedImages\(/);
assert.doesNotMatch(route, /bucket.file\(path\).delete/);
const upload = readFileSync('src/server/editableImageUploadService.ts', 'utf8');
assert.equal((upload.match(/\.\.\.\(mobileEditorSessionHash \? \{ mobileEditorSessionHash \} : \{\}\)/g) ?? []).length, 3);
console.log('Mobile staged upload session binding, reference guards and generation-pinned cleanup checks passed');
