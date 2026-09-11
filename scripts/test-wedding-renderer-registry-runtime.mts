import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';

Object.assign(globalThis, { React });

register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);

const { WEDDING_THEME_CLOSING_DEFINITIONS } = await import(
  '../src/app/_components/weddingPageRenderers.tsx'
);
const { getWeddingThemeRenderer } = await import(
  '../src/app/_components/themeRenderers/registry.ts'
);

const weddingClosingProps = {
  state: {
    isLoading: false,
    imagesLoading: false,
    pageConfig: {
      groomName: '도영',
      brideName: '해비',
    },
  },
  options: { theme: 'gyeol' },
} as never;

for (const definition of WEDDING_THEME_CLOSING_DEFINITIONS) {
  const registryRenderer = getWeddingThemeRenderer(definition.key);
  assert.equal(
    typeof registryRenderer,
    'function',
    `${definition.key} should resolve its production wedding renderer`
  );

  const tree = registryRenderer({
    ...weddingClosingProps,
    options: { theme: definition.key },
  } as never) as {
    type: unknown;
    props: {
      children: Array<{ type: unknown; props: Record<string, unknown> }>;
      'data-theme': string;
      'data-wedding-closing-canvas': boolean;
    };
  };
  const closingSlot = tree.props.children.at(-1);

  assert.equal(
    tree.type,
    'div',
    `${definition.key} should keep the Page and closing in one bounded canvas`
  );
  assert.equal(
    tree.props['data-wedding-closing-canvas'],
    true,
    `${definition.key} should expose the shared closing canvas contract`
  );
  assert.equal(
    tree.props['data-theme'],
    definition.key,
    `${definition.key} should pass its registry theme identifier to the closing canvas`
  );
  assert.equal(
    tree.props.children.length,
    2,
    `${definition.key} should render its Page followed by exactly one closing`
  );
  assert.ok(closingSlot, `${definition.key} should render a final closing slot`);
  assert.equal(
    typeof closingSlot.type,
    'function',
    `${definition.key} closing should be a shared component`
  );

  const closingMarkup = (closingSlot.type as (props: Record<string, unknown>) => {
    props: Record<string, unknown>;
  })(closingSlot.props);
  assert.equal(
    closingMarkup.props['data-wedding-closing'],
    true,
    `${definition.key} should render the shared WeddingClosing footer`
  );
  assert.equal(
    closingMarkup.props['data-theme'],
    definition.key,
    `${definition.key} should render the matching closing variant`
  );
}

console.log('production wedding renderer closing checks passed');

// Render the real five-theme composition, including shared interactive section shells.
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');
const page = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));
page.groomName = '테스트 신랑';
page.brideName = '테스트 신부';
page.couple.groom.name = page.groomName;
page.couple.bride.name = page.brideName;
page.couple.groom.phone = '01000000000';
page.productTier = 'premium';
page.features = { maxGalleryImages: 18, shareMode: 'card', showMusic: true, showCountdown: true, showGuestbook: true };
page.pageData = {
  ...page.pageData,
  greetingMessage: '실제 저장된 초대 문구',
  ceremonyAddress: '테스트 장소 주소',
  giftInfo: { groomAccounts: [{ bank: '테스트은행', accountNumber: '000000', accountHolder: '테스트 신랑' }], brideAccounts: [], message: '마음 전하기' },
};
const state = {
  status: 'ready', pageConfig: page, isLoading: false, imagesLoading: false,
  setIsLoading: () => undefined,
  mainImageUrl: 'https://example.com/hero.jpg', heroImageUrl: 'https://example.com/hero.jpg',
  galleryImageUrls: ['https://example.com/gallery.jpg'], galleryPreviewImageUrls: ['https://example.com/thumbnail.jpg'],
  weddingDate: new Date(2027, 3, 12, 16, 30), giftInfo: page.pageData.giftInfo, hasGiftAccounts: true,
} as never;
const renderedCovers = new Set<string>();
for (const { key: theme } of WEDDING_THEME_CLOSING_DEFINITIONS) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(getWeddingThemeRenderer(theme), { state, options: { theme } })
    ));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${theme} must expose exactly one cover heading`);
    assert.ok(html.includes(page.groomName) && html.includes(page.brideName));
    assert.ok(html.includes('tel:01000000000') && html.includes('sms:01000000000'));
    for (const section of ['invitation', 'contact', 'gallery', 'schedule', 'gift', 'guestbook']) {
      assert.equal((html.match(new RegExp(`data-wedding-section="${section}"`, 'g')) ?? []).length, 1,
        `${theme} must render its ${section} exactly once`);
    }
    assert.equal((html.match(/data-public-invitation-feature="calendar-countdown"/g) ?? []).length, 1);
    const galleryBeforeInvitation = html.indexOf('data-wedding-section="gallery"') < html.indexOf('data-wedding-section="invitation"');
    assert.equal(galleryBeforeInvitation, false, `${theme} should introduce the couple before the gallery`);
    const calendarBeforeSchedule = html.indexOf('data-public-invitation-feature=') < html.indexOf('data-wedding-section="schedule"');
    assert.equal(calendarBeforeSchedule, true,
      'Every design keeps its optional calendar inside the ceremony section before directions');
    const heading = html.match(/<h1[\s\S]*?<\/h1>/)?.[0];
    const cover = html.match(/<section[^>]*aria-labelledby="wedding-cover-title"[\s\S]*?<\/section>/)?.[0];
    assert.ok(heading && cover, `${theme} must render an accessible cover`);
    renderedCovers.add(cover);
  } finally {
    queryClient.clear();
  }
}
assert.equal(renderedCovers.size, 5, 'The five wedding variants must render distinct cover compositions');
console.log('Five wedding compositions and preserved sections rendered successfully');
