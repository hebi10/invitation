import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as coverSettings from '../src/lib/weddingCover.ts';
import { createInvitationPageFromSeed, getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { getWeddingPreviewThemeKeys } from '../src/lib/eventPreviewLinks.ts';

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const { default: WeddingCover } = await import('../src/app/_components/public-invitations/wedding/WeddingCover.tsx');
const page = createInvitationPageFromSeed(structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna')));
page.groomName = '저장된긴신랑이름';
page.brideName = '저장된긴신부이름';
page.venue = '저장된 예식장과 긴 홀 이름';
const time = '오후 2시 30분';
const imageUrl = '/saved-representative-photo.jpg';

for (const theme of getWeddingPreviewThemeKeys()) {
  for (const textPosition of ['theme', 'below', 'top', 'bottom'] as const) {
    const supplied = structuredClone(page);
    supplied.pageData = { ...supplied.pageData, weddingCover: { focusX: 0, focusY: 83, textPosition } };
    const original = JSON.stringify(supplied);
    const html = renderToStaticMarkup(React.createElement(WeddingCover, { theme, page: supplied, imageUrl, time }));
    const position = textPosition === 'theme' ? theme === 'romantic' ? 'bottom' : 'below' : textPosition;
    assert.ok(html.indexOf('<img ') < html.indexOf('<h1'), `${theme}/${textPosition}: the cover starts with the saved photo`);
    assert.match(html, /object-position:0% 83%/, `${theme}/${textPosition}: zero horizontal focus and saved vertical focus reach the photo`);
    assert.match(html, new RegExp(`data-cover-position="${position}"`));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${theme}/${textPosition}: one accessible invitation title`);
    for (const text of [page.groomName, page.brideName, page.venue, time]) {
      assert.ok(html.includes(text), `${theme}/${textPosition}: saved ${text} is retained`);
    }
    assert.match(html, /loading="eager"/);
    const photoFrameEnd = html.indexOf('data-wedding-cover-details');
    assert.ok(photoFrameEnd > html.indexOf('<img '));
    assert.ok(html.indexOf(page.venue) > photoFrameEnd, `${theme}/${textPosition}: venue stays outside the photograph`);
    assert.ok(html.indexOf(time) > photoFrameEnd, `${theme}/${textPosition}: time stays outside the photograph`);
    assert.equal(JSON.stringify(supplied), original, 'Rendering never mutates persisted settings');

    const noPhoto = renderToStaticMarkup(React.createElement(WeddingCover, { theme, page: supplied, imageUrl: '', time }));
    assert.doesNotMatch(noPhoto, /<img\b|data-wedding-cover-frame/);
    assert.equal((noPhoto.match(/<h1\b/g) ?? []).length, 1);
    for (const text of [page.groomName, page.brideName, page.venue, time]) assert.ok(noPhoto.includes(text));
  }
}
// Keep the mounted component's hook state while changing its image prop.
let hookInitialized = false;
let hookValue: unknown;
let renderChanged = false;
const componentExports: Record<string, unknown> = {};
const dependencies: Record<string, unknown> = {
  react: { useState(initial: unknown) {
    if (!hookInitialized) { hookInitialized = true; hookValue = initial; }
    return [hookValue, (next: unknown) => { hookValue = next; renderChanged = true; }];
  } },
  'react/jsx-runtime': jsxRuntime,
  '@/lib/weddingCover': coverSettings,
  './WeddingCover.module.css': { default: {} },
  './WeddingFonts.css': {},
  './vow/VowCover': {},
};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/app/_components/public-invitations/wedding/WeddingCover.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: componentExports, require(name: string) {
  assert.ok(name in dependencies, `Unexpected cover dependency: ${name}`);
  return dependencies[name];
} });
const ControlledCover = componentExports.default as typeof WeddingCover;
function renderMounted(image: string) {
  let tree: React.ReactElement;
  let renders = 0;
  do {
    renderChanged = false;
    tree = ControlledCover({ theme: 'simple', page, imageUrl: image, time,
      settings: { focusX: 20, focusY: 70, textPosition: 'top' } });
    assert.ok(++renders < 5, 'Changing the photo must settle without a render loop');
  } while (renderChanged);
  return tree;
}
function findPhoto(node: unknown): React.ReactElement<{ onError: () => void }> | undefined {
  if (Array.isArray(node)) return node.map(findPhoto).find(Boolean);
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return undefined;
  if (node.type === 'img') return node as React.ReactElement<{ onError: () => void }>;
  return findPhoto(node.props.children);
}
findPhoto(renderMounted('/photo-a.jpg'))!.props.onError();
const failed = renderToStaticMarkup(renderMounted('/photo-a.jpg'));
assert.doesNotMatch(failed, /<img\b/);
assert.match(failed, /data-cover-position="below"/);
assert.ok(failed.includes(page.groomName) && failed.includes(page.venue));
assert.ok(findPhoto(renderMounted('/photo-b.jpg')), 'A different photo can load after an error');
assert.ok(findPhoto(renderMounted('/photo-a.jpg')), 'Reselecting a previously failed photo must retry loading');
assert.match(renderToStaticMarkup(renderMounted('/photo-a.jpg')), /data-cover-position="top"/);
console.log('Six wedding covers preserve content, focus, positions and recoverable photo fallbacks.');
