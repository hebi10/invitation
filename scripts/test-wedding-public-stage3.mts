import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const base = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const cover = read('src/app/_components/public-invitations/wedding/WeddingCover.module.css');
const swiper = read('src/components/sections/Gallery/WeddingGallerySwiper.module.css');
const gallery = read('src/app/_components/public-invitations/wedding/WeddingGallery.module.css');
const coverComponent = read('src/app/_components/public-invitations/wedding/WeddingCover.tsx');
const galleryComponent = read('src/app/_components/public-invitations/wedding/WeddingGallery.tsx');
const page = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');

assert.match(cover, /\.basic \.photoFrame \{ width: 92%; margin-inline: auto; aspect-ratio: 3 \/ 4; \}/);
assert.match(cover, /\.editorial \.photoFrame \{ aspect-ratio: 4 \/ 5; \}/);
assert.match(cover, /\.basic \.details \{ padding: 26px 24px 22px; \}/);
assert.match(cover, /\.editorial \.editorialHeading \{[\s\S]*?font-size: 13px;[\s\S]*?letter-spacing: \.12em;/);
assert.match(cover, /\.editorial \.editorialNames \{ gap: 0; font-size: clamp\(30px, 8vw, 34px\);/);
assert.match(cover, /\.basic \.venue \{ margin-top: 8px; \}/);

assert.match(swiper, /\.gallery\[data-gallery-variant='simple'\] \.photoButton \{ aspect-ratio: 3 \/ 4;/);
assert.match(swiper, /\.gallery\[data-gallery-variant='simple'\] \.photo \{ object-fit: contain; \}/);
assert.match(gallery, /\.editorial \.imageGrid \{[\s\S]*?gap: 18px 12px;/);
assert.match(gallery, /\.editorial \.photoNumber \{[\s\S]*?padding-top: 8px;/);
assert.match(gallery, /\.editorial \.overviewCard \{[\s\S]*?min-height: 52px;/);
assert.match(base, /\.page\[data-design='simple'\] \[data-wedding-section='gallery'\] > \.container \{\s*width: calc\(100% - 32px\);/);
assert.match(base, /\.page\[data-design='classic-r'\] \{\s*--editorial-gutter: 44px;/);
assert.match(base, /\.page\[data-design='classic-r'\] :is\(\.heading, \.title\)::before \{\s*font-size: 30px;/);
assert.match(base, /\.page\[data-design='classic-r'\] :is\(\.heading, \.title\)::after \{\s*font-size: 13px;/);
assert.match(base, /\.page\[data-design='classic-r'\] \[data-wedding-section='gallery'\] > \.container \{\s*width: calc\(100% - 40px\);/);
assert.match(base, /@media \(max-width: 359px\) \{[\s\S]*?\.page\[data-design='simple'\] \[data-wedding-section='gallery'\]/);
assert.match(base, /\.page\[data-design='classic-r'\] \.ceremonySection \.ceremonyContent \.venueName \{\s*margin-top: 12px;/);

for (const key of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.match(galleryComponent, new RegExp(key.replace('-', '-')), 'Retain the renderer for ' + key);
}
assert.match(galleryComponent, /layout="carousel"/);
assert.match(galleryComponent, /swiperVariant=\{variant\}/);
assert.doesNotMatch(galleryComponent, /usesGrid/, 'All five sold themes must use the slider');
assert.match(coverComponent, /data-wedding-cover-frame/);
assert.match(coverComponent, /style=\{\{ objectPosition: /);
assert.match(page, /<WeddingCalendarDownload/);
assert.match(page, /<LocationMap/);
assert.match(page, /<GuestbookThemed/);
assert.match(page, /<GiftInfoThemed/);
assert.match(page, /<WeddingGallery/);

console.log('Stage 3 simple/modern styles and retained wedding features passed');
