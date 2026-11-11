import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wedding = readFileSync('src/app/_components/public-invitations/wedding/WeddingBase.tsx', 'utf8');
const css = readFileSync('src/app/_components/public-invitations/wedding/WeddingBase.module.css', 'utf8');
const gallery = readFileSync('src/app/_components/public-invitations/wedding/WeddingGallery.tsx', 'utf8');
const guestbook = readFileSync('src/components/sections/Guestbook/GuestbookThemed.tsx', 'utf8');
const closing = readFileSync('src/app/_components/WeddingClosing.tsx', 'utf8');

const header = wedding.match(/<nav className=\{styles\.quickLinks\}[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
const footer = wedding.match(/<nav className=\{styles\.returnLinks\}[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
const hrefs = (value: string) => [...value.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(hrefs(header), ['wedding-info', 'wedding-location', 'wedding-gallery']);
assert.deepEqual(hrefs(footer).slice(0, 2), ['wedding-info', 'wedding-location']);
assert.match(header, /state\.galleryImageUrls\.length > 0/);
for (const id of new Set([...hrefs(header), ...hrefs(footer)])) {
  assert.match(wedding, new RegExp('id="' + id + '"'), 'Missing wedding section for ' + id);
}
assert.match(wedding, /<WeddingCalendarDownload/);
assert.match(wedding, /<LocationMap/);
assert.match(wedding, /<GiftInfoThemed/);
assert.match(wedding, /<GuestbookThemed/);
assert.match(wedding, /<WeddingGallery/);
assert.match(wedding, /href=\{\`tel:\$\{venuePhone\}\`\}/);
assert.match(guestbook, /const commentsPerPage = 5;/);
assert.match(guestbook, /onSubmit=\{handleSubmit\}/);
assert.match(guestbook, /const handleSubmit = async/);
assert.match(closing, /data-wedding-closing/);

assert.match(css, /Stage 2: shared reading rhythm/);
assert.match(css, /\.page \.quickLinks a \{\s*white-space: nowrap;/);
assert.match(css, /\.page \[data-wedding-section='gallery'\] > \.container \{\s*margin-top: clamp\(44px, 12vw, 64px\);/);
assert.match(css, /\.page \.ceremonySection > \.ceremonyContent \{\s*margin-bottom: clamp\(12px, 3\.5vw, 18px\);/);
assert.match(css, /\.page \.scheduleSection \.scheduleContent \{\s*row-gap: clamp\(6px, 1\.8vw, 9px\);/);
assert.match(css, /\.page:not\(\[data-design='simple'\]\) \[data-wedding-section='guestbook'\] \.commentsGrid \{/);
assert.match(css, /\.page \.returnLinks a \{\s*min-height: 44px;/);
assert.doesNotMatch(css, /Stage 2[\s\S]*?display:\s*none\s*;/);
assert.match(gallery, /layout="carousel"/);
assert.match(gallery, /swiperVariant=\{variant\}/);

console.log('Stage 2 wedding reading order, preserved features and spacing checks passed');
