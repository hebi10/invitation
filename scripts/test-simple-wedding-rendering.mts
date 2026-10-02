import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import type { WeddingPageReadyState } from '../src/app/_components/weddingPageState.tsx';
import type { InvitationThemeKey } from '../src/lib/invitationThemes.ts';
import { resolveWeddingCoverImage } from '../src/lib/weddingCoverImage.ts';

const savedCover = 'https://firebasestorage.googleapis.com/v0/b/test/o/saved-cover.jpg';
const beforeStorage = resolveWeddingCoverImage({ configuredUrl: savedCover });
const afterStorage = resolveWeddingCoverImage({
  configuredUrl: savedCover,
  fallbackUrl: 'https://example.com/old-main.jpg',
  fallbackThumbnailUrl: 'https://example.com/gallery-first.jpg',
});
assert.deepEqual(afterStorage, beforeStorage, '저장소 로딩 후에도 지정된 표지 사진 유지');
assert.equal(afterStorage.mainImageUrl, savedCover);
assert.deepEqual(resolveWeddingCoverImage({
  configuredUrl: savedCover, matchingThumbnailUrl: 'https://example.com/saved-cover-thumb.jpg',
}), { mainImageUrl: savedCover, heroImageUrl: 'https://example.com/saved-cover-thumb.jpg' });
assert.deepEqual(resolveWeddingCoverImage({
  configuredUrl: '', fallbackUrl: 'https://example.com/main.jpg',
  fallbackThumbnailUrl: 'https://example.com/main-thumb.jpg',
}), { mainImageUrl: 'https://example.com/main.jpg', heroImageUrl: 'https://example.com/main-thumb.jpg' });
assert.deepEqual(resolveWeddingCoverImage({ configuredUrl: '' }), { mainImageUrl: '', heroImageUrl: '' });

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');
const { default: WeddingBase } = await import('../src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const { default: WeddingGallery } = await import('../src/app/_components/public-invitations/wedding/WeddingGallery.tsx');
const { WeddingClosing } = await import('../src/app/_components/WeddingClosing.tsx');
const { withWeddingClosing } = await import('../src/app/_components/weddingPageRenderers.tsx');

const page = createInvitationPageFromSeed(structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna')));
page.groomName = '저장신랑';
page.brideName = '저장신부';
page.date = '2030년 5월 18일 토요일';
page.venue = '저장예식장';
page.couple.groom = { name: page.groomName, phone: '01011112222', father: { name: '저장아버지', relation: '아버지', phone: '01033334444' } };
page.couple.bride = { name: page.brideName, phone: '01055556666' };
page.features = { showCountdown: true, showGuestbook: true, maxGalleryImages: 18 };
page.pageData = {
  greetingMessage: '공통인사말', greetingAuthor: '저장서명',
  ceremony: { time: '오후 2시 30분' }, ceremonyAddress: '저장주소 123', ceremonyContact: '02-111-2222',
  mapUrl: 'https://map.kakao.com/test-saved', mapDescription: '저장 교통 설명',
  reception: { time: '오후 1시', location: '저장피로연' },
  venueGuide: [{ title: '저장주차', content: '저장주차내용' }],
  wreathGuide: [{ title: '저장화환', content: '저장화환내용' }],
  giftInfo: { message: '저장계좌안내', groomAccounts: [{ bank: '저장은행', accountHolder: '저장예금주', accountNumber: '111-222-333' }] },
  themeOverrides: { simple: { greetingMessage: '기본형전용인사말' } },
};
const state: WeddingPageReadyState = {
  status: 'ready', blockMessage: null, pageConfig: page, isLoading: false, setIsLoading: () => undefined,
  isRefreshingPage: false, refreshPage: async () => undefined, imagesLoading: false,
  mainImageUrl: 'https://example.com/stored-cover.jpg', heroImageUrl: 'https://example.com/stored-cover.jpg',
  galleryImageUrls: ['/stored-gallery.jpg'], galleryPreviewImageUrls: ['/stored-thumb.jpg'],
  preloadImages: [], adminNotice: null, weddingDate: new Date(2030, 4, 18, 14, 30),
  hasGiftAccounts: true, giftInfo: page.pageData.giftInfo,
};
function render(theme: InvitationThemeKey, suppliedState = state) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
      React.createElement(React.Fragment, null,
        React.createElement(WeddingBase, { state: suppliedState, theme, options: { slug: page.slug, theme }, demoComments: [], showMap: true }),
        React.createElement(WeddingClosing, { groomName: page.groomName, brideName: page.brideName, theme }),
      ),
    ));
  } finally { client.clear(); }
}
const before = JSON.stringify(state);
const simple = render('simple');
const nonSimple = render('romantic');
assert.equal(JSON.stringify(state), before, 'Rendering must not mutate persisted input');
for (const html of [simple, nonSimple]) {
  for (const value of ['저장신랑', '저장신부', page.date, page.venue, '오후 2시 30분', '저장주소 123', '저장서명', '저장아버지', '저장 교통 설명', '저장피로연', '저장주차내용', '저장화환내용', '저장예금주', '111-222-333']) {
    assert.ok(html.includes(value), `Saved content missing: ${value}`);
  }
  assert.ok(html.includes(state.mainImageUrl), 'Saved cover should pass through');
  assert.ok(html.includes('href="tel:01011112222"'));
  assert.ok(html.includes('href="sms:01055556666"'));
  assert.ok(html.includes('href="tel:021112222"'));
  assert.ok(html.includes('href="https://map.kakao.com/test-saved"'));
  assert.equal((html.match(/data-wedding-closing="true"/g) ?? []).length, 1);
}
assert.ok(simple.includes('기본형전용인사말'));
assert.ok(nonSimple.includes('공통인사말'));
assert.ok(!nonSimple.includes('기본형전용인사말'));
const order = ['invitation', 'contact', 'gallery', 'ceremony', 'schedule', 'transport', 'gift', 'guestbook'];
let previous = -1;
for (const section of order) {
  const position = simple.indexOf(`data-wedding-section="${section}"`);
  assert.ok(position > previous, `Incorrect simple section order: ${section}`);
  previous = position;
}
assert.ok(simple.includes('캘린더에 저장'));
assert.equal((simple.match(/id="wedding-info"/g) ?? []).length, 1);
assert.equal((simple.match(/id="wedding-location"/g) ?? []).length, 1);
for (const theme of ['classic-r', 'romantic', 'gyeol', 'emotional'] as const) {
  const html = render(theme);
  let lastPosition = -1;
  for (const section of order) {
    const position = html.indexOf(`data-wedding-section="${section}"`);
    assert.ok(position > lastPosition, `${theme} should retain the basic information order: ${section}`);
    lastPosition = position;
  }
  assert.ok(html.includes('캘린더에 저장'));
  const contactMarkup = html.slice(html.indexOf('data-wedding-section="contact"'), html.indexOf('data-wedding-section="gallery"'));
  assert.ok(contactMarkup.indexOf('href="tel:01011112222"') < contactMarkup.indexOf('저장아버지'));
  assert.ok(html.includes(state.mainImageUrl));
  assert.equal((html.match(/id="wedding-info"/g) ?? []).length, 1);
  assert.equal((html.match(/id="wedding-location"/g) ?? []).length, 1);
}
const empty = structuredClone(page);
empty.couple = { groom: { name: page.groomName }, bride: { name: page.brideName } };
empty.pageData = {};
empty.features = { showCountdown: false, showGuestbook: false };
const emptyMarkup = render('simple', { ...state, pageConfig: empty, galleryImageUrls: [], galleryPreviewImageUrls: [], giftInfo: undefined, hasGiftAccounts: false });
for (const section of ['invitation', 'contact', 'gallery', 'transport', 'gift', 'guestbook']) {
  assert.ok(!emptyMarkup.includes(`data-wedding-section="${section}"`), `Empty optional content should be omitted: ${section}`);
}
assert.ok(!emptyMarkup.includes('예식 달력 보기'));
for (const theme of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional'] as const) {
  const noPhoto = render(theme, { ...state, pageConfig: empty, mainImageUrl: '', heroImageUrl: '', galleryImageUrls: [], galleryPreviewImageUrls: [] });
  assert.ok(!noPhoto.includes('data-wedding-cover-photo'), `${theme}: no blank cover image`);
  assert.ok(!noPhoto.includes('href="#wedding-gallery"'), `${theme}: no empty gallery jump`);
  assert.ok(noPhoto.includes('href="#wedding-location"'), `${theme}: directions remain reachable`);
  assert.ok(noPhoto.includes(page.groomName) && noPhoto.includes(page.venue));
  for (const count of [0, 1, 2, 6, 7]) {
    const images = Array.from({ length: count }, (_, index) => `https://example.com/photo-${index}.jpg`);
    const previews = images.map((image) => image.replace('.jpg', '-thumb.jpg'));
    const gallery = WeddingGallery({ theme, images, previewImages: previews, imageAltPrefix: '저장된 사진', styles: { popup: 'shared-dialog' } });
    assert.equal(gallery.props.layout, theme === 'simple' || theme === 'gyeol' ? 'carousel' : 'grid');
    assert.equal(gallery.props.swiperVariant, theme === 'simple' || theme === 'gyeol' ? theme : undefined);
    assert.deepEqual(gallery.props.images, images, `${theme}: original order and full gallery retained`);
    assert.deepEqual(gallery.props.previewImages, previews);
    assert.equal(gallery.props.styles.popup, 'shared-dialog', `${theme}: accessible enlargement reused`);
  }
}
console.log('wedding stored content and shared section order across five designs passed');

// The printed Korean date must preserve the stored month, day, weekday and ceremony time.
for (const dateCase of [
  { year: 2030, month: 0, day: 1, label: '2030년 1월 1일 화요일', expected: '2030년1월1일화요일오후2시30분' },
  { year: 2028, month: 1, day: 29, label: '2028년 2월 29일 화요일', expected: '2028년2월29일화요일오후2시30분' },
  { year: 2030, month: 11, day: 31, label: '2030년 12월 31일 화요일', expected: '2030년12월31일화요일오후2시30분' },
]) {
  const suppliedPage = structuredClone(page);
  suppliedPage.date = dateCase.label;
  suppliedPage.weddingDateTime = { ...page.weddingDateTime, year: dateCase.year, month: dateCase.month, day: dateCase.day };
  const beforeDateRender = JSON.stringify(suppliedPage);
  const html = render('gyeol', { ...state, pageConfig: suppliedPage });
  const ceremony = html.slice(html.indexOf('id="wedding-info"'), html.indexOf('id="wedding-location"'));
  const ceremonyText = ceremony.replace(/^[^>]*>/, '').replace(/<[^>]+>/g, '').replace(/\s/g, '');
  assert.ok(ceremonyText.includes(dateCase.expected), `GYEOL ceremony must show the saved Korean date and time: ${dateCase.label}`);
  assert.equal(JSON.stringify(suppliedPage), beforeDateRender, 'Date presentation must not mutate saved data');
}
console.log('GYEOL Korean ceremony date, leap day and month boundaries passed');

// The garden letter separates its date from details without changing saved facts.
for (const dateCase of [
  { year: 2030, month: 0, day: 1, label: '2030년 1월 1일 화요일', expected: '2030년01.01화요일오후2시30분' },
  { year: 2028, month: 1, day: 29, label: '2028년 2월 29일 화요일', expected: '2028년02.29화요일오후2시30분' },
  { year: 2030, month: 11, day: 31, label: '2030년 12월 31일 화요일', expected: '2030년12.31화요일오후2시30분' },
]) {
  const suppliedPage = structuredClone(page);
  suppliedPage.date = dateCase.label;
  suppliedPage.weddingDateTime = { ...page.weddingDateTime, year: dateCase.year, month: dateCase.month, day: dateCase.day };
  const beforeDateRender = JSON.stringify(suppliedPage);
  const html = render('emotional', { ...state, pageConfig: suppliedPage });
  const ceremony = html.slice(html.indexOf('id="wedding-info"'), html.indexOf('id="wedding-location"'));
  const ceremonyText = ceremony.replace(/^[^>]*>/, '').replace(/<[^>]+>/g, '').replace(/\s/g, '');
  assert.ok(ceremonyText.includes(dateCase.expected), `Garden letter must preserve the saved date and time: ${dateCase.label}`);
  assert.equal((ceremonyText.match(/오후2시30분/g) ?? []).length, 1, 'Ceremony time should appear once');
  assert.equal(JSON.stringify(suppliedPage), beforeDateRender, 'Garden date presentation must not mutate saved data');
}
console.log('Garden letter ceremony date, leap day and month boundaries passed');

// The compact cover puts saved event facts before the photo without losing date boundaries.
for (const dateCase of [
  { year: 2030, month: 0, day: 1, expected: '2030.01.01' },
  { year: 2028, month: 1, day: 29, expected: '2028.02.29' },
  { year: 2030, month: 11, day: 31, expected: '2030.12.31' },
]) {
  const suppliedPage = structuredClone(page);
  suppliedPage.weddingDateTime = { ...page.weddingDateTime, year: dateCase.year, month: dateCase.month, day: dateCase.day };
  const beforeDateRender = JSON.stringify(suppliedPage);
  const html = render('simple', { ...state, pageConfig: suppliedPage });
  const coverStart = html.indexOf('aria-labelledby="wedding-cover-title"');
  const cover = html.slice(coverStart, html.indexOf('</section>', coverStart));
  const coverText = cover.replace(/<[^>]+>/g, '').replace(/\s/g, '');
  assert.ok(coverText.includes(`${dateCase.expected}화요일`), 'Simple cover must preserve the saved numeric date and weekday');
  assert.ok(coverText.includes('오후2시30분'), 'Simple cover must retain the stored ceremony time');
  let previousPosition = -1;
  for (const value of [page.groomName, dateCase.expected, page.venue, 'data-wedding-cover-photo', '둘이 하나가 되는 특별한 날']) {
    const position = cover.indexOf(value);
    assert.ok(position > previousPosition, `Simple cover reading order must lead with event facts: ${value}`);
    previousPosition = position;
  }
  assert.equal(JSON.stringify(suppliedPage), beforeDateRender, 'Simple cover must not mutate saved event facts');
}
console.log('Simple cover event order, numeric date and month boundaries passed');

// Selecting a story preview must not repeat cover/closing photos or hide originals from the viewer.
const storyCover = '/story-cover.jpg';
function renderPhotoStory(images: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Story = withWeddingClosing(
    (props) => React.createElement(WeddingBase, { ...props, theme: 'romantic', demoComments: [], showMap: false }),
    { theme: 'romantic' },
  );
  try {
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
      React.createElement(Story, {
        state: { ...state, mainImageUrl: storyCover, heroImageUrl: storyCover, galleryImageUrls: images, galleryPreviewImageUrls: images },
        options: { slug: page.slug, theme: 'romantic' },
      }),
    ));
  } finally { client.clear(); }
}
const photoStoryImages = [storyCover, '/story-a.jpg', '/story-a.jpg', '/story-b.jpg', '/story-c.jpg'];
const photoStory = renderPhotoStory(photoStoryImages);
const photoSources = [...photoStory.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => {
  const url = new URL(match[1].replaceAll('&amp;', '&'), 'https://example.com');
  return url.searchParams.get('url') ?? match[1];
});
assert.deepEqual(photoSources, [storyCover, '/story-a.jpg', '/story-b.jpg', '/story-c.jpg'],
  'Cover, preview and closing each display their own image once in saved order');
assert.match(photoStory, /전체 사진 5장 보기/, 'The full viewer keeps originals omitted from the story preview');
assert.deepEqual(photoStoryImages, [storyCover, '/story-a.jpg', '/story-a.jpg', '/story-b.jpg', '/story-c.jpg']);
for (const images of [[], ['/story-a.jpg'], ['/story-a.jpg', '/story-b.jpg'], [storyCover]]) {
  const html = renderPhotoStory(images);
  const footer = html.slice(html.indexOf('<footer'));
  assert.doesNotMatch(footer, /<img\b/, 'Small collections end with thanks without repeating a photograph');
  assert.ok(footer.includes('귀한 걸음과 따뜻한 마음에'));
  if (images.length) assert.ok(html.includes(`전체 사진 ${images.length}장 보기`));
}
console.log('Romantic cover, gallery and closing image allocation passed');
