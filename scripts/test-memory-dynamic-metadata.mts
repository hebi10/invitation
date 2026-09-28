import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

let currentMetadata: Record<string, unknown> | null = null;
const exports: Record<string, unknown> = {};
const compiled = ts.transpileModule(readFileSync('src/app/memory/[slug]/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(compiled, {
  exports,
  require: (name: string) => {
    if (name.includes('weddingPages')) return { getWeddingPageBySlug: () => null, getAllWeddingPageSlugs: () => [] };
    if (name.includes('memoryPageMetadataSnapshot')) return { getMemoryPageMetadataBySlug: () => null, getMemoryPageMetadataSlugs: () => [] };
    if (name.includes('memoryPageMetadataService')) return { getPublicMemoryPageMetadata: async () => currentMetadata };
    return {};
  },
});
assert.notEqual(exports.dynamicParams, false, 'New memory slugs must resolve without rebuilding');
assert.equal(exports.dynamic, 'force-dynamic', 'Visibility changes must be read on each request');
const generateMetadata = exports.generateMetadata as (input: { params: Promise<{ slug: string }> }) => Promise<{
  title: string; robots: { index: boolean }; openGraph?: { title: string }; twitter?: { title: string };
}>;
const input = { params: Promise.resolve({ slug: 'created-after-deploy' }) };
currentMetadata = { enabled: true, visibility: 'public', title: '새 추억 페이지', introMessage: '새 기록', seoTitle: '', seoDescription: '', seoNoIndex: false, heroImageUrl: '/hero.webp', heroThumbnailUrl: '' };
const published = await generateMetadata(input);
assert.equal(published.title, '새 추억 페이지');
assert.equal(published.openGraph?.title, published.title);
assert.equal(published.twitter?.title, published.title);
assert.equal(published.robots.index, true);
currentMetadata = null;
const privatePage = await generateMetadata(input);
assert.equal(privatePage.robots.index, false);
assert.notEqual(privatePage.title, published.title);

const { getPublicMemoryPageMetadata } = await import('../src/server/memoryPageMetadataService');
const publicRecord = { enabled: true, visibility: 'public', title: '공개', ownerEmail: 'private@example.test', heroImage: { url: '/hero.webp' } };
const repository = { findBySlug: async () => publicRecord as Record<string, unknown> | null };
assert.equal((await getPublicMemoryPageMetadata('new-page', repository))?.title, '공개');
assert.equal('ownerEmail' in (await getPublicMemoryPageMetadata('new-page', repository))!, false);
assert.equal(await getPublicMemoryPageMetadata('new-page', { findBySlug: async () => ({ ...publicRecord, visibility: 'private' }) }), null);
assert.equal(await getPublicMemoryPageMetadata('new-page', { findBySlug: async () => ({ ...publicRecord, enabled: false }) }), null);
assert.equal(await getPublicMemoryPageMetadata('new-page', { findBySlug: async () => null }), null);
assert.equal(await getPublicMemoryPageMetadata('new-page', { findBySlug: async () => { throw new Error('offline'); } }), null);
console.log('Dynamic memory routes and current public metadata checks passed');
