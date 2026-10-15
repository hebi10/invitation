import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { getWeddingPreviewThemeKeys, getEventPreviewLinks } from '../src/lib/eventPreviewLinks.ts';
import { DEFAULT_INVITATION_THEME, getSelectableInvitationThemeKeys } from '../src/lib/invitationThemes.ts';
import { resolveWeddingRouteTheme } from '../src/lib/weddingThemePolicy.ts';
import type { WeddingPageReadyState } from '../src/app/_components/weddingPageState.tsx';

const seed = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));
assert.equal(resolveWeddingRouteTheme(seed, 'vow'), 'vow', 'The added design must resolve on existing wedding URLs');
assert.equal(DEFAULT_INVITATION_THEME, 'emotional', 'Existing default selection must remain unchanged');
assert.deepEqual(getWeddingPreviewThemeKeys(), ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional', 'vow']);
assert.ok(getSelectableInvitationThemeKeys().includes('vow'));
assert.ok(getEventPreviewLinks({ slug: seed.slug, eventType: 'wedding' }).some(link => link.path === `/${seed.slug}/vow`));

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');
const { getWeddingThemeRenderer } = await import('../src/app/_components/themeRenderers/registry.ts');
const { default: WeddingBase } = await import('../src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const page = createInvitationPageFromSeed(seed);
page.groomName = '김서약';
page.brideName = '이약속';
page.venue = '서약 예식장';
page.date = '2030년 5월 18일 토요일';
page.pageData = { greetingMessage: '저장한 초대 문장', ceremony: { time: '오후 2시' }, venueGuide: [{ title: '주차', content: '주차장 이용 안내' }] };
page.features = { showGuestbook: false, showCountdown: false };
const state = {
  status: 'ready', pageConfig: page, isLoading: false, imagesLoading: false,
  setIsLoading: () => undefined, mainImageUrl: '', heroImageUrl: '', galleryImageUrls: [], galleryPreviewImageUrls: [],
  weddingDate: new Date(2030, 4, 18, 14), hasGiftAccounts: false,
} as unknown as WeddingPageReadyState;
function render(suppliedState = state) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
      React.createElement(getWeddingThemeRenderer('vow'), { state: suppliedState, options: { slug: page.slug, theme: 'vow' } })));
  } finally { client.clear(); }
}
const original = JSON.stringify(state);
const noPhoto = render();
const cover = noPhoto.match(/<section[^>]*aria-labelledby="wedding-cover-title"[\s\S]*?<\/section>/)?.[0] ?? '';
for (const text of [page.groomName, page.brideName, page.date, page.venue, '오후 2시']) assert.ok(cover.includes(text), `Photo-free cover must retain ${text}`);
assert.ok(!cover.includes('<img'), 'The vow cover must not depend on a photo');
assert.ok(noPhoto.includes('저장한 초대 문장'));
assert.ok(!noPhoto.includes('data-wedding-section="gallery"'));
assert.ok(!noPhoto.includes('href="#wedding-accounts"'), 'Do not link to absent accounts');
assert.equal((noPhoto.match(/data-wedding-closing="true"/g) ?? []).length, 1);
const withPhoto = render({ ...state, mainImageUrl: '/saved-vow-photo.jpg' });
assert.ok(withPhoto.includes('/saved-vow-photo.jpg'), 'Optional saved photo opens the invitation');
assert.ok(withPhoto.indexOf('data-wedding-cover-photo') < withPhoto.indexOf('저장한 초대 문장'));
assert.equal((withPhoto.match(/data-wedding-cover-photo/g) ?? []).length, 1, 'The representative photo is not duplicated after the introduction');
assert.equal(JSON.stringify(state), original, 'Rendering must not alter stored content');
for (const theme of getWeddingPreviewThemeKeys()) {
  const client = new QueryClient();
  try {
    const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(WeddingBase, {
      state, theme, options: { slug: page.slug, theme }, showMap: false,
    })));
    assert.ok(html.includes('aria-label="예식 정보 다시 보기"'), `${theme}: directions must remain reachable at the bottom`);
    const guide = html.slice(html.indexOf('data-wedding-section="transport"'));
    assert.ok(guide.includes('</details>') && guide.slice(guide.indexOf('</details>')).includes('주차'), `${theme}: collapsed guide must advertise available information`);
  } finally { client.clear(); }
}
const { buildPreview, WeddingPreviewContent } = await import('../src/app/wizard-preview/WizardPreviewClient.tsx');
const { SAMPLE_WEDDING_COVER, SAMPLE_WEDDING_IMAGES } = await import('../src/config/homeWeddingSample.ts');
const previewSeed = structuredClone(seed);
previewSeed.metadata.images.wedding = '';
previewSeed.productTier = 'premium';
previewSeed.features = { showGuestbook: false, showCountdown: false, maxGalleryImages: 18 };
previewSeed.pageData = { greetingMessage: '편집 중인 한글 서약장', galleryImages: [] };
const beforePreview = JSON.stringify(previewSeed);
const photoFreePreview = buildPreview(previewSeed, 'vow');
const previewClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
try {
  const previewHtml = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: previewClient },
    React.createElement(WeddingPreviewContent, { state: photoFreePreview, theme: 'vow' })));
  assert.ok(previewHtml.includes('data-design="vow"'), 'Selecting vow must render its actual design in the editor preview');
  assert.ok(previewHtml.includes('편집 중인 한글 서약장'));
  assert.equal(photoFreePreview.mainImageUrl, '', 'Vow must not insert a sample cover into a photo-free draft');
  assert.deepEqual(photoFreePreview.galleryImageUrls, [], 'Vow must not insert a sample gallery into a photo-free draft');
  assert.doesNotMatch(previewHtml, /data-wedding-vow-portrait|data-wedding-section="gallery"|<img\b/,
    'The photo-free editor preview must retain the public photo-free composition');
  assert.equal((previewHtml.match(/data-wedding-closing="true"/g) ?? []).length, 1);
} finally { previewClient.clear(); }
assert.equal(JSON.stringify(previewSeed), beforePreview, 'Preview generation must not mutate the photo-free draft');

for (const theme of ['simple', 'emotional', 'romantic', 'gyeol', 'classic-r'] as const) {
  const legacyPreview = buildPreview(previewSeed, theme);
  assert.equal(legacyPreview.mainImageUrl, SAMPLE_WEDDING_COVER, `${theme}: existing empty-draft cover examples remain available`);
  assert.deepEqual(legacyPreview.galleryImageUrls, SAMPLE_WEDDING_IMAGES.filter(url => url !== SAMPLE_WEDDING_COVER),
    `${theme}: existing empty-draft gallery examples remain available`);
}
previewSeed.metadata.images.wedding = '/editor-vow-cover.jpg';
const coverOnlyPreview = buildPreview(previewSeed, 'vow');
assert.equal(coverOnlyPreview.mainImageUrl, '/editor-vow-cover.jpg', 'Vow previews retain a supplied representative photo');
assert.deepEqual(coverOnlyPreview.galleryImageUrls, [], 'A supplied representative photo must not add a sample gallery');
previewSeed.metadata.images.wedding = '';
previewSeed.pageData.galleryImages = ['/editor-vow-first.jpg', '/editor-vow-second.jpg'];
const galleryOnlyPreview = buildPreview(previewSeed, 'vow');
assert.equal(galleryOnlyPreview.mainImageUrl, '', 'A supplied gallery must not add a sample representative photo');
assert.deepEqual(galleryOnlyPreview.galleryImageUrls, ['/editor-vow-first.jpg', '/editor-vow-second.jpg']);
console.log('Vow theme routing, public/editor photo-free rendering, saved content and shared guest navigation passed.');
