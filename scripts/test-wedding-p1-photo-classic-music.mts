import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const gallery = read('src/app/_components/public-invitations/wedding/WeddingGallery.module.css');
const cover = read('src/app/_components/public-invitations/wedding/WeddingCover.module.css');
const base = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const musicCss = read('src/components/media/BackgroundMusic.module.css');
const music = read('src/components/media/BackgroundMusic.tsx');
const wedding = read('src/app/_components/EventInvitationPage.tsx');
const sample = read('src/app/sample-invitation/SampleInvitation.tsx');
const sampleRoute = read('src/app/sample-invitation/page.tsx');

assert.match(gallery, /\.album \.imageWrapper:first-child\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*aspect-ratio:\s*6\s*\/\s*5;/s);
assert.match(gallery, /\.album \.imageWrapper:first-child \.imageContainer img\s*\{[^}]*object-position:/s);
assert.match(cover, /\.traditional \.photoFrame\s*\{\s*aspect-ratio:\s*3\s*\/\s*4;/);
assert.match(cover, /\.traditional \.traditionalFrame\s*\{[^}]*padding:\s*18px 18px 16px;/s);
assert.match(cover, /\.traditionalFrame\s*\{[^}]*border:\s*1px solid #d8c8b4;[^}]*outline:\s*1px solid #ad9478;/s);
assert.match(base, /\.page\[data-design='romantic'\] \[data-wedding-section='gallery'\] > \.container\s*\{[^}]*margin-top:\s*36px;/s);
assert.match(base, /\.page\[data-design='romantic'\] \.ceremonySection\s*\{[^}]*margin-top:\s*34px;/s);
assert.match(musicCss, /@media \(min-width:\s*769px\)\s*\{\s*\.musicPlayer\.invitationAligned\s*\{[^}]*right:\s*max\(12px,\s*calc\(50vw - 228px\)\);/s);
assert.match(music, /alignToInvitation\?: boolean/);
assert.match(music, /alignToInvitation = false/);
assert.match(wedding, /<BackgroundMusic\s+alignToInvitation\s+autoPlay/s);
for (const path of [
  'src/app/_components/birthday/BirthdayInvitationPage.tsx',
  'src/app/_components/firstBirthday/FirstBirthdayInvitationPage.tsx',
]) {
  assert.doesNotMatch(read(path), /alignToInvitation/);
}
assert.match(sample, /theme = 'simple'/);
assert.match(sampleRoute, /query\.qaTheme === 'romantic' \|\| query\.qaTheme === 'gyeol'/);
assert.match(sample, /demoComments=\{sampleWeddingComments\}/);
assert.doesNotMatch(sampleRoute, /firestore|\.setDoc\(|\.updateDoc\(/i);

console.log('P1 photo gallery, classic frame, and desktop wedding music static contracts passed.');
