import assert from 'node:assert/strict';
import { register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeWeddingIntroStyle, shouldShowWeddingIntro, weddingIntroSessionKey } from '../src/lib/weddingIntro.ts';

assert.equal(normalizeWeddingIntroStyle(undefined), 'none');
assert.equal(normalizeWeddingIntroStyle('unknown'), 'none');
for (const style of ['light', 'cinema', 'envelope'] as const) {
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '', seen: false }), true);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '#wedding-location', seen: false }), false);
  assert.equal(shouldShowWeddingIntro({ style, preview: false, hash: '', seen: true }), false);
  assert.equal(shouldShowWeddingIntro({ style, preview: true, hash: '#wedding-location', seen: true }), true);
}
assert.equal(shouldShowWeddingIntro({ style: 'none', preview: true, hash: '', seen: false }), false);
assert.notEqual(weddingIntroSessionKey('a'), weddingIntroSessionKey('b'));
Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const { default: WeddingIntro } = await import('../src/components/sections/WeddingIntro/WeddingIntro.tsx');
for (const style of ['none', 'light', 'cinema', 'envelope'] as const) {
  const html = renderToStaticMarkup(React.createElement(WeddingIntro, {
    style, slug: 'intro-test', groomName: '신랑', brideName: '신부', date: '', imageUrl: '',
  }));
  assert.equal(html.includes('data-wedding-intro-pending="true"'), style !== 'none', '서버 첫 응답부터 인트로 배경이 본문을 가려야 합니다');
  if (style !== 'none') assert.ok(html.includes('<noscript>'), 'JavaScript를 사용할 수 없으면 본문을 가리지 않아야 합니다');
}
console.log('Wedding intro session, preview and deep link policy passed');
