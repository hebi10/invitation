import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInvitationPageFromSeed } from '../src/config/weddingPages';
import { shinMinjeKimHyunjiConfig } from '../src/config/pages/shin-minje-kim-hyunji';
import { collectWizardProtectedMediaUrls, getStableInvitationImageFile, getWizardProtectedMediaUrl, resolveWizardMediaDisplayUrl } from '../src/lib/invitationStableMedia';
import { mapInvitationImageFields, materializeInvitationMediaUrls } from '../src/lib/invitationPreviewMedia';

const slug = 'editor-fixture';
const stable = '/api/public/media/editor-fixture/cover.webp/';
const thumb = '/api/public/media/editor-fixture/thumb.webp/';
const external = 'https://images.test/photo.jpg';
const legacy = 'https://firebasestorage.googleapis.com/v0/b/fixture/o/wedding-images%2Feditor-fixture%2Fcover.webp?alt=media&token=fixture';
const coverPath = '/api/customer/events/editor-fixture/media/cover.webp/';
const thumbPath = '/api/customer/events/editor-fixture/media/thumb.webp/';
const source = createInvitationPageFromSeed(shinMinjeKimHyunjiConfig);
const config = {
  ...source, slug,
  metadata: { ...source.metadata, images: { wedding: stable, social: 'https://invite.msgnote.kr' + stable, favicon: '/favicon.ico', kakaoCard: legacy } },
  pageData: { ...source.pageData, coverImageThumbnailUrl: thumb, galleryImages: [stable, external, legacy, stable],
    galleryImageThumbnailUrls: [thumb, external, legacy, thumb],
    themeOverrides: { romantic: { galleryImages: [stable], coverImageThumbnailUrl: thumb } } },
};
assert.equal(getStableInvitationImageFile(stable, slug), 'cover.webp');
assert.equal(getWizardProtectedMediaUrl('https://invite.msgnote.kr' + stable, slug), coverPath);
for (const bad of [
  stable.replace(slug, 'other'), stable.slice(0, -1), stable + '?token=bad',
  '/api/public/media/editor-fixture/..%2Fcover.webp/',
  'https://other.test' + stable, '//other.test' + stable, legacy,
]) assert.equal(getWizardProtectedMediaUrl(bad, slug), null);
assert.deepEqual(collectWizardProtectedMediaUrls(config, slug), [coverPath, thumbPath]);
const unchanged = JSON.stringify(config);
const requested: string[] = [];
const revoked: string[] = [];
let serial = 0;
const dependencies = {
  fetchImage: async (url: string, options: RequestInit) => {
    requested.push(url);
    assert.equal((options.headers as Record<string, string>).Authorization, 'Bearer test-only');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    return new Response(Uint8Array.from([1, 2, 3]), { headers: { 'Content-Type': 'image/webp' } });
  },
  createObjectUrl: () => 'blob:fixture-' + (++serial),
  revokeObjectUrl: (url: string) => { revoked.push(url); },
};
const materialized = await materializeInvitationMediaUrls(collectWizardProtectedMediaUrls(config, slug), slug, 'customer',
  'test-only', new AbortController().signal, dependencies);
assert.deepEqual(requested, [coverPath, thumbPath]);
const resolve = (value: string) => resolveWizardMediaDisplayUrl(value, slug, materialized.objects);
const view = mapInvitationImageFields(config, resolve);
assert.equal(view.metadata.images.wedding, view.metadata.images.social);
assert.match(view.metadata.images.wedding, /^blob:fixture-/);
assert.equal(view.metadata.images.kakaoCard, legacy);
assert.deepEqual(view.pageData?.galleryImages, [view.metadata.images.wedding, external, legacy, view.metadata.images.wedding]);
assert.equal(view.pageData?.themeOverrides?.romantic?.galleryImages?.[0], view.metadata.images.wedding);
assert.equal(resolveWizardMediaDisplayUrl(stable, slug, new Map()), '');
assert.equal(resolveWizardMediaDisplayUrl(stable.replace(slug, 'other'), slug, new Map()), '');
assert.equal(resolveWizardMediaDisplayUrl(external, slug, new Map()), external);
assert.equal(JSON.stringify(config), unchanged, 'Preview data must not overwrite the saved form');
materialized.dispose();
assert.equal(revoked.length, 2);
assert.equal(materialized.objects.size, 0);
const wizard = readFileSync('src/app/page-wizard/PageWizardClient.tsx', 'utf8');
assert.match(wizard, /resolveImageDisplayUrl=\{wizardMedia.resolve\}/);
assert.match(wizard, /<WeddingWizardPreview formState=\{wizardMedia.displayConfig \?\? formState\}/);
assert.match(wizard, /formState=\{wizardMedia.displayConfig \?\? previewFormState\}/);
assert.match(wizard, /\n      formState=\{formState\}/, 'Workspace persistence must continue receiving the raw form');
const images = readFileSync('src/app/page-wizard/steps/ImagesStep.tsx', 'utf8');
assert.match(images, /selectedUrls=\{galleryImages\}/, 'Image selection identity remains the saved reference');
assert.match(images, /src=\{resolveImageDisplayUrl\(imageUrl\)\}/);
assert.match(images, /const effectiveImage = imageUrl \|\| fallbackImage/);
console.log('Wizard stable media identity, protected reads and display-only projection checks passed');
