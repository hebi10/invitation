import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import type { WeddingPageReadyState } from '../src/app/_components/weddingPageState.tsx';
import type { InvitationThemeKey } from '../src/lib/invitationThemes.ts';

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');
const { default: WeddingBase } = await import('../src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const { WeddingClosing } = await import('../src/app/_components/WeddingClosing.tsx');

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
  galleryImageUrls: ['https://example.com/stored-gallery.jpg'], galleryPreviewImageUrls: ['https://example.com/stored-thumb.jpg'],
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
assert.ok(!nonSimple.includes('data-wedding-section="ceremony"'));
assert.ok(!nonSimple.includes('data-wedding-section="transport"'));
assert.ok(!nonSimple.includes('캘린더에 저장'));
assert.ok(nonSimple.indexOf('저장아버지') < nonSimple.indexOf('href="tel:01011112222"'), 'Other themes retain parent-first contacts');
const empty = structuredClone(page);
empty.couple = { groom: { name: page.groomName }, bride: { name: page.brideName } };
empty.pageData = {};
empty.features = { showCountdown: false, showGuestbook: false };
const emptyMarkup = render('simple', { ...state, pageConfig: empty, galleryImageUrls: [], galleryPreviewImageUrls: [], giftInfo: undefined, hasGiftAccounts: false });
for (const section of ['invitation', 'contact', 'gallery', 'transport', 'gift', 'guestbook']) {
  assert.ok(!emptyMarkup.includes(`data-wedding-section="${section}"`), `Empty optional content should be omitted: ${section}`);
}
assert.ok(!emptyMarkup.includes('예식 달력 보기'));
console.log('simple wedding stored content, section order and non-simple preservation checks passed');
