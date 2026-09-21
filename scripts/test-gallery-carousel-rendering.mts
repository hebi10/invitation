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
const { default: WeddingGallerySwiper } = await import(
  '../src/components/sections/Gallery/WeddingGallerySwiper.tsx'
);

// Invoke the rendered Image error callbacks inside an SSR hook owner so React
// applies the actual component state updates without adding a DOM test runtime.
const findImages = (node: React.ReactNode): React.ReactElement<{ src: string; onError: () => void }>[] => {
  if (!React.isValidElement(node)) return [];
  const props = node.props as { src?: string; onError?: () => void; children?: React.ReactNode | ((state: { isActive: boolean }) => React.ReactNode) };
  if (props.src && props.onError) return [node as React.ReactElement<{ src: string; onError: () => void }>];
  const children = typeof props.children === 'function' ? props.children({ isActive: true }) : props.children;
  return React.Children.toArray(children).flatMap(findImages);
};
for (const distinctPreview of [true, false]) {
  const original = 'https://example.com/original.jpg';
  const preview = distinctPreview ? 'https://example.com/preview.jpg' : original;
  const attempts: string[] = [];
  function FailureHarness() {
    const tree = WeddingGallerySwiper({
      images: ['/first.jpg', original], previewImages: ['/first.jpg', preview],
      variant: 'gyeol', reducedMotion: true, altPrefix: '갤러리', onOpen: () => undefined,
    });
    const failedPhoto = findImages(tree).filter((image) => image.props.src === preview || image.props.src === original);
    if (failedPhoto.length) {
      assert.equal(failedPhoto.length, 2, 'Slide and companion should share the same fallback source');
      attempts.push(failedPhoto[0].props.src);
      assert.ok(attempts.length <= 2, 'Image failures must not retry indefinitely');
      failedPhoto[1].props.onError();
    }
    return tree;
  }
  const failed = renderToStaticMarkup(React.createElement(FailureHarness));
  assert.deepEqual(attempts, distinctPreview ? [preview, original] : [original]);
  assert.match(failed, /사진을 불러오지 못했습니다/);
  assert.match(failed, /눌러서 원본 보기/);
  assert.match(failed, /2번째 사진 선택/, 'Failed companions remain selectable');
}

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
for (const swiperVariant of ['simple', 'romantic', 'emotional', 'classic-r', 'gyeol'] as const) {
  const renderSwiper = (images: string[]) => renderToStaticMarkup(React.createElement(GalleryGridShared, {
    images, layout: 'carousel', swiperVariant, styles,
  }));
  assert.equal(renderSwiper([]), '', `${swiperVariant}: empty gallery remains absent`);
  const one = renderSwiper(['/one.jpg']);
  assert.match(one, new RegExp(`data-gallery-variant="${swiperVariant}"`));
  assert.doesNotMatch(one, /이전 사진|다음 사진/, 'A single photo does not show unusable navigation');
  assert.doesNotMatch(one, /다른 사진 선택/, 'A single photo does not duplicate itself into an album');
  const seven = renderSwiper(Array.from({ length: 7 }, (_, i) => `/${i}.jpg`));
  assert.equal((seven.match(/swiper-slide"/g) ?? []).length, 7, 'Every photo is reachable without a separate more button');
  assert.doesNotMatch(seven, /더보기/);
  assert.match(seven, /다음 사진/);
  if (swiperVariant === 'romantic' || swiperVariant === 'gyeol') {
    assert.match(seven, /aria-label="다른 사진 선택"/);
    assert.equal((seven.match(/번째 사진 선택"/g) ?? []).length, 2, 'Albums provide two companion photos');
    assert.doesNotMatch(seven, /1번째 사진 선택"/, 'The active hero is excluded from companion photos');
    const two = renderSwiper(['/one.jpg', '/two.jpg']);
    assert.equal((two.match(/번째 사진 선택"/g) ?? []).length, 1, 'A two-photo album never repeats a companion');
  } else {
    assert.doesNotMatch(seven, /다른 사진 선택/, 'Single-photo and strip layouts stay focused on their track');
  }
}
console.log('Gallery carousel server rendering checks passed');
