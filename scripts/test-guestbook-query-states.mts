import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire, register } from 'node:module';

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query');
const { default: GuestbookThemed } = await import('../src/components/sections/Guestbook/GuestbookThemed.tsx');
function render(status: 'pending' | 'error' | 'success', cached = false, hasMore = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: Infinity } } });
  const query = client.getQueryCache().build(client, { queryKey: ['guestbook-comments', 'sample', 'page', null] });
  query.setState({ status, error: status === 'error' ? new Error('offline') : null,
    data: status === 'success' || cached ? { comments: cached ? [{ id: 'one', author: '하객', message: '기존 축하 메시지', createdAt: new Date(0), pageSlug: 'sample' }] : [], hasMore, nextCursor: hasMore ? 'next' : null } : undefined });
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(GuestbookThemed, {
    pageSlug: 'sample', styles: {}, title: '방명록', subtitle: '', statusColors: { success: '#333', error: '#933' },
  })));
  client.clear();
  return html;
}
assert.match(render('pending'), /방명록을 불러오는 중/);
assert.doesNotMatch(render('pending'), /첫 축하 메시지/);
assert.match(render('error'), /방명록을 불러오지 못했습니다/);
assert.match(render('error'), /다시 시도/);
assert.doesNotMatch(render('error'), /첫 축하 메시지/);
assert.match(render('success'), /첫 축하 메시지/);
assert.match(render('error', true), /기존 축하 메시지/);
assert.match(render('error', true), /방명록을 불러오지 못했습니다/);
assert.doesNotMatch(render('success', false, true), /첫 축하 메시지/);
assert.match(render('success', false, true), /다음 페이지를 확인/);
console.log('guestbook query state tests passed');
