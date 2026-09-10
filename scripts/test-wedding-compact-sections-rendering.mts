import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { appQueryKeys } from '../src/lib/appQuery.ts';

// Match the classic JSX runtime used by the existing tsx rendering checks.
Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
// The TSX components use the CommonJS package entry; share its query context.
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');

const { default: GiftInfoThemed } = await import(
  '../src/components/sections/GiftInfo/GiftInfoThemed.tsx'
);
const { default: GuestbookThemed } = await import(
  '../src/components/sections/Guestbook/GuestbookThemed.tsx'
);

const giftProps = {
  styles: { accountSection: 'account-section', accountSummary: 'account-summary' },
  title: '마음 전하실 곳',
  groomSectionTitle: '신랑측 계좌',
  brideSectionTitle: '신부측 계좌',
  copyLabel: '복사',
  groomAccounts: [{ bank: '신랑은행', accountNumber: '111-222', accountHolder: '김신랑' }],
  brideAccounts: [{ bank: '신부은행', accountNumber: '333-444', accountHolder: '이신부' }],
};
const renderGift = (collapsibleAccounts?: boolean) => renderToStaticMarkup(
  React.createElement(GiftInfoThemed, { ...giftProps, collapsibleAccounts })
);
const defaultGift = renderGift();
const compactGift = renderGift(true);
assert.equal(defaultGift, renderGift(false), 'Omitting the option preserves the expanded default');
assert.doesNotMatch(defaultGift, /<details/);
assert.match(defaultGift, /<h3>신랑측 계좌<\/h3>/);
assert.match(defaultGift, /<h3>신부측 계좌<\/h3>/);
assert.equal((compactGift.match(/<details class="account-section">/g) ?? []).length, 2);
assert.match(compactGift, /<summary class="account-summary">신랑측 계좌<\/summary>/);
assert.match(compactGift, /<summary class="account-summary">신부측 계좌<\/summary>/);
assert.doesNotMatch(compactGift, /<details[^>]*\bopen(?:=|\s|>)/);
for (const markup of [defaultGift, compactGift]) {
  for (const account of [...giftProps.groomAccounts, ...giftProps.brideAccounts]) {
    assert.ok(markup.includes(account.bank));
    assert.ok(markup.includes(account.accountNumber));
    assert.ok(markup.includes(account.accountHolder));
    assert.ok(markup.includes(`aria-label="${account.accountHolder} 복사"`));
  }
  assert.equal((markup.match(/<button/g) ?? []).length, 2);
}
const emptyGift = renderToStaticMarkup(React.createElement(GiftInfoThemed, {
  ...giftProps, groomAccounts: [], brideAccounts: [], collapsibleAccounts: true,
}));
assert.doesNotMatch(emptyGift, /<details/, 'Empty account groups should remain absent');

const pageSlug = 'compact-sections-test';
const renderGuestbook = (collapsibleForm?: boolean) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(appQueryKeys.guestbookComments(pageSlug), [{
    id: 'test-comment', pageSlug, author: '축하하는 친구',
    message: '두 분의 결혼을 축하합니다.', createdAt: new Date('2026-09-10T00:00:00Z'),
  }]);
  try {
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(GuestbookThemed, {
        pageSlug, collapsibleForm,
        styles: { formDisclosure: 'form-disclosure', formSummary: 'form-summary', label: 'label' },
        title: '축하의 말', subtitle: '따뜻한 마음을 남겨 주세요.',
        statusColors: { success: '#000', error: '#333' },
      })
    ));
  } finally {
    queryClient.clear();
  }
};
const defaultGuestbook = renderGuestbook();
const compactGuestbook = renderGuestbook(true);
assert.equal(defaultGuestbook, renderGuestbook(false));
assert.doesNotMatch(defaultGuestbook, /<details/);
assert.equal((compactGuestbook.match(/<details/g) ?? []).length, 1);
assert.match(compactGuestbook, /<details class="form-disclosure"><summary class="form-summary">축하 글 남기기<\/summary><form[\s\S]*<\/form><\/details>/);
assert.doesNotMatch(compactGuestbook, /<details[^>]*\bopen(?:=|\s|>)/);
for (const markup of [defaultGuestbook, compactGuestbook]) {
  assert.equal((markup.match(/<form/g) ?? []).length, 1);
  assert.match(markup, /<h2>축하의 말<\/h2>/);
  assert.ok(markup.includes('따뜻한 마음을 남겨 주세요.'));
  assert.match(markup, /<label[^>]*>이름<\/label>/);
  assert.match(markup, /<label[^>]*>메시지<\/label>/);
  assert.match(markup, />메시지 남기기<\/button>/);
  assert.ok(markup.includes('축하하는 친구'));
  assert.ok(markup.includes('두 분의 결혼을 축하합니다.'));
}
assert.ok(compactGuestbook.indexOf('</details>') < compactGuestbook.indexOf('축하하는 친구'),
  'Existing comments stay outside the collapsed form');
console.log('Wedding compact sections server rendering checks passed');
