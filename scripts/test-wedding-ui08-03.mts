import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const wedding = read('src/app/_components/public-invitations/wedding/WeddingGallery.tsx');
const shared = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const swiper = read('src/components/sections/Gallery/WeddingGallerySwiper.tsx');
const styles = read('src/components/sections/Gallery/WeddingGallerySwiper.module.css');
const base = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');

for (const theme of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.ok(wedding.includes(`'${theme}'`), `Missing slider theme ${theme}`);
  assert.ok(styles.includes(`data-gallery-variant='${theme}'`), `Missing theme-specific style ${theme}`);
}
assert.match(wedding, /layout="carousel"/);
assert.match(wedding, /swiperVariant=\{variant\}/);
assert.doesNotMatch(wedding, /layout=\{usesGrid/);
assert.match(wedding, /previewImages=\{previewImages\}/);
assert.match(base, /images=\{state\.galleryImageUrls\}/);
assert.match(base, /previewImages=\{state\.galleryPreviewImageUrls\}/);
assert.match(shared, /<WeddingGallerySwiper/);
assert.match(shared, /useDialogLayer/);
assert.match(shared, /triggerRef\.current\.focus\(\)/);
assert.match(swiper, /allowTouchMove=\{count > 1\}/);
assert.match(swiper, /event\.key === 'ArrowRight'/);
assert.match(swiper, /onOpen\(imageIndex, event\.currentTarget\)/);
assert.match(swiper, /onSlideChange=\{\(swiper\) => setIndex\(swiper\.activeIndex\)\}/);
assert.match(swiper, /reducedMotion \? 'slide'/);
assert.match(swiper, /speed=\{reducedMotion \? 0/);
assert.match(swiper, /aria-live="polite"/);
assert.match(swiper, /onError=\{\(\) => setFailedImages/);
console.log('UI-08-03: five slider variants, originals, preview fallback, modal and accessibility contracts verified');
