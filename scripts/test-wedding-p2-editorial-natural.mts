import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const gallery = read('src/app/_components/public-invitations/wedding/WeddingGallery.module.css');
const base = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const cover = read('src/app/_components/public-invitations/wedding/WeddingCover.module.css');
const sampleRoute = read('src/app/sample-invitation/page.tsx');
const samplePage = read('src/app/sample-invitation/SampleInvitation.tsx');
const galleryComponent = read('src/app/_components/public-invitations/wedding/WeddingGallery.tsx');
const sharedGallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');

assert.match(gallery, /\.editorial \.photoNumber\s*\{[^}]*padding-top:\s*8px;[^}]*color:\s*var\(--ink,[^}]*font-size:\s*14px;[^}]*line-height:\s*1\.6;/s);
assert.match(gallery, /\.editorial \.overviewCount\s*\{[^}]*color:\s*var\(--ink,[^}]*font-size:\s*14px;/s);
assert.match(base, /\.page\[data-design='classic-r'\] :is\(\.heading, \.title\)::after\s*\{\s*font-size:\s*13px;\s*line-height:\s*1\.5;/s);
assert.match(base, /\.page\[data-design='classic-r'\] \.photoDate span\s*\{[^}]*font-size:\s*14px;/s);
assert.match(cover, /\.editorial \.editorialHeading\s*\{[^}]*font-size:\s*13px;/s);

assert.match(gallery, /\.natural \.imageGrid\s*\{\s*gap:\s*16px 12px;\s*align-items:\s*start;/s);
assert.match(gallery, /\.natural \.imageWrapper:first-child\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*justify-self:\s*start;[^}]*width:\s*86%;/s);
assert.match(gallery, /\.natural \.imageWrapper\[data-photo-position='4'\]\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*justify-self:\s*start;[^}]*width:\s*86%;/s);
assert.match(gallery, /\.natural \.imageGrid\[data-photo-count='1'\] \.imageWrapper\s*\{\s*justify-self:\s*start;/s);
assert.match(gallery, /\.overviewCard:focus-visible\s*\{[^}]*outline:\s*2px/);

for (const theme of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.ok(sampleRoute.includes("query.qaTheme === '" + theme + "'") || theme === 'simple');
}
assert.match(samplePage, /theme = 'simple'/);
assert.match(sampleRoute, /const qaUI07 = process\.env\.NODE_ENV !== 'production' && query\.qaUI07 === '1'/);
assert.match(sampleRoute, /const qaUI07Map = qaUI07 &&/);
assert.match(samplePage, /showMap=\{qaUI07 && qaUI07Map !== 'off'\}/);
assert.doesNotMatch(sampleRoute, /(?:firestore|setDoc|updateDoc|deleteDoc)/i);
assert.match(galleryComponent, /layout=\{usesGrid \? 'grid' : 'carousel'\}/);
assert.match(sharedGallery, /aria-label=\{\`\$\{resolvedImageAltPrefix\}/);
assert.match(sharedGallery, /handleDialogKeyDown/);

console.log('P2 editorial typography, natural image grid alignment, and isolated five-theme QA contracts passed.');
