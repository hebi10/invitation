import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const cover = read('src/app/_components/public-invitations/wedding/WeddingCover.module.css');
const gallery = read('src/app/_components/public-invitations/wedding/WeddingGallery.module.css');
const page = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const coverComponent = read('src/app/_components/public-invitations/wedding/WeddingCover.tsx');
const galleryComponent = read('src/app/_components/public-invitations/wedding/WeddingGallery.tsx');
const pageComponent = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');

assert.match(cover, /\.photographic \.photoFrame \{ aspect-ratio: 2 \/ 3; \}/);
assert.match(cover, /\.photographic \.details \{\s*padding: 24px 24px 22px;/);
assert.match(cover, /\.photographic \.photoCopy \.names \{\s*gap: 8px;/);
assert.match(cover, /\.photographic \.photoMeta \.date \{\s*margin-top: 14px;/);

assert.match(cover, /\.traditional \.traditionalFrame \{\s*padding: 24px 18px 22px;/);
assert.match(cover, /\.traditional \.traditionalEyebrow \{\s*font-size: 12px;\s*color: #63584a;/);
assert.match(cover, /\.traditional \.traditionalTitle \{\s*margin-top: 16px;/);
assert.match(cover, /\.traditionalFrame \{[^}]*border: 1px solid #d8c8b4;[^}]*outline: 1px solid #ad9478;/);
assert.match(cover, /\.traditional \.date \{\s*margin-top: 16px;/);

assert.match(cover, /\.letter \.details \{\s*padding: 24px 24px 20px;/);
assert.match(cover, /\.letter \.letterHeading \{\s*margin-top: 18px;/);
assert.match(cover, /\.letter \.letterMeta \{\s*margin-top: 18px;/);
assert.match(cover, /\.letterSprig \{[^}]*garden-sprig\.webp/);

assert.match(gallery, /\.album \.imageGrid \{\s*gap: 14px 10px;/);
assert.match(gallery, /\.album \.imageWrapper:first-child \{\s*grid-column: 1 \/ -1;/);
assert.match(gallery, /\.natural \.imageGrid \{\s*gap: 16px 12px;/);
assert.match(gallery, /\.natural \.imageWrapper:first-child \{[^}]*justify-self: start;[^}]*width: 86%;[^}]*aspect-ratio: 4 \/ 5;/);
assert.match(gallery, /\.natural \.imageWrapper\[data-photo-position='4'\] \{[^}]*justify-self: start;[^}]*width: 86%;/);

assert.match(page, /Stage 4: theme-specific spacing around real wedding content/);
assert.match(page, /\.page\[data-design='romantic'\] \.ceremonySection \{\s*margin-top: 42px;\s*padding-block: 30px;/);
assert.match(page, /\.page\[data-design='gyeol'\] \.ceremonySection \{\s*margin-top: 44px;\s*padding: 26px 20px 22px;/);
assert.match(page, /\.page\[data-design='emotional'\] \.invitationSection \{\s*margin-top: 36px;/);
assert.match(page, /\.page\[data-design='emotional'\] \.ceremonySection \{\s*margin-top: 48px;\s*padding-block: 28px;/);

// The design must keep the existing public features and saved photo focus.
assert.match(coverComponent, /data-wedding-cover-photo loading="eager"/);
assert.match(coverComponent, /objectPosition: \`\$\{cover\.focusX\}% \$\{cover\.focusY\}%\`/);
assert.match(coverComponent, /if \(theme === 'romantic'\)/);
assert.match(coverComponent, /if \(theme === 'emotional'\)/);
assert.match(coverComponent, /if \(theme === 'gyeol'\)/);
assert.match(coverComponent, /if \(theme === 'classic-r'\)/);
assert.match(galleryComponent, /layout=\{usesGrid \? 'grid' : 'carousel'\}/);
assert.match(galleryComponent, /overviewIndices=\{theme === 'romantic' \? overviewIndices : undefined\}/);
for (const feature of ['WeddingCalendarDownload', 'LocationMap', 'GiftInfoThemed', 'GuestbookThemed', 'WeddingGallery', 'WeddingCover']) {
  assert.match(pageComponent, new RegExp('<' + feature), feature + ' must remain available');
}
for (const design of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.match(page, new RegExp("data-design='" + design + "'"));
}
assert.match(cover, /\.basic \.photoFrame \{ width: 92%; margin-inline: auto; aspect-ratio: 3 \/ 4; \}/);
assert.match(cover, /\.editorial \.photoFrame \{ aspect-ratio: 4 \/ 5; \}/);
assert.match(gallery, /\.editorial \.imageGrid \{[^}]*gap: 18px 12px;/);

console.log('Stage 4 photo/classic/natural styling and full shared wedding features passed');
