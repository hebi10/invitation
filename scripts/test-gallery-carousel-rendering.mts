import assert from 'node:assert/strict';
import { register } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// The project's preserved JSX is compiled by tsx with the classic runtime here.
Object.assign(globalThis, { React });

register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);
const { default: GalleryGridShared } = await import(
  '../src/components/sections/Gallery/GalleryGridShared.tsx'
);

const styles = {
  imageGrid: 'image-grid', imageWrapper: 'image-wrapper', carousel: 'carousel',
  carouselControls: 'carousel-controls', carouselButton: 'carousel-button',
  carouselCounter: 'carousel-counter',
};
const render = (images: string[], layout?: 'grid' | 'carousel') =>
  renderToStaticMarkup(React.createElement(GalleryGridShared, { images, layout, styles }));

assert.equal(render([], 'carousel'), '', 'Empty galleries should remain absent');
const single = render(['/one.jpg'], 'carousel');
assert.match(single, /class="carousel"/, 'Carousel should reserve a single portrait slot');
assert.equal((single.match(/class="image-wrapper"/g) ?? []).length, 1);
assert.equal((single.match(/disabled=""/g) ?? []).length, 2, 'Single photo disables both controls');
assert.match(single, /aria-live="polite"[^>]*>1 \/ 1</, 'Counter should announce position');
const multiple = render(['/one.jpg', '/two.jpg'], 'carousel');
assert.match(multiple, />이전 사진<\/button>/);
assert.match(multiple, />다음 사진<\/button>/);
assert.equal((multiple.match(/disabled=""/g) ?? []).length, 1);
const grid = render(Array.from({ length: 7 }, (_, i) => `/${i}.jpg`));
assert.match(grid, /class="image-grid"/);
assert.match(grid, /더보기\(1장\)/);
assert.doesNotMatch(grid, /carousel-controls/);
console.log('Gallery carousel server rendering checks passed');
