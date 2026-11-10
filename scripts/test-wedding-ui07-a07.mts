import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');
const route = source('src/app/sample-invitation/page.tsx');
const sample = source('src/app/sample-invitation/SampleInvitation.tsx');
const base = source('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const css = source('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const qa = source('scripts/qa-invitation-ui07-a07.py');
const workflow = source('.github/workflows/invitation-ui07-a07-qa.yml');

assert.match(route, /process\.env\.NODE_ENV !== 'production' && query\.qaUI07 === '1'/);
assert.match(route, /const qaUI07Case = qaUI07 &&/);
assert.match(route, /qaUI07Case=\{qaUI07Case\}/);

for (const variant of ['full', 'groom', 'bride', 'empty', 'long']) {
  assert.ok(sample.includes("'" + variant + "'"), 'Missing A-07 synthetic variant ' + variant);
  assert.ok(qa.includes('"' + variant + '"'), 'QA variant not exercised: ' + variant);
}
assert.match(sample, /function withoutPhone\(/);
assert.match(sample, /function makeQAUI07State\(/);
assert.match(sample, /showCountdown: false/);
assert.match(sample, /showGuestbook: false/);
assert.match(sample, /galleryImageUrls: \[\]/);
assert.match(sample, /hasGiftAccounts: false/);
assert.match(sample, /giftInfo: undefined/);
assert.match(sample, /greetingMessage: longText/);
assert.doesNotMatch(sample, /(?:setDoc|updateDoc|deleteDoc|addDoc)\(/);

for (const section of ['invitation', 'contact', 'gallery', 'ceremony', 'schedule', 'transport', 'gift', 'guestbook']) {
  assert.ok(base.includes('data-wedding-section="' + section + '"'), 'Missing section ' + section);
}
assert.match(base, /<WeddingCalendarDownload/);
assert.match(base, /<LocationMap/);
assert.match(base, /<WeddingGallery/);
assert.match(base, /<GiftInfoThemed/);
assert.match(base, /<GuestbookThemed/);

assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /:focus-visible/);
assert.match(qa, /keyboard/);
assert.match(qa, /contrast/);
assert.match(qa, /zoom/);
assert.match(qa, /gallery/);
assert.match(qa, /horizontal_overflow/);
assert.match(workflow, /pull_request:/);
assert.match(workflow, /npm ci/);
assert.match(workflow, /playwright==1\.56\.0/);
assert.match(workflow, /upload-artifact@v4/);
assert.doesNotMatch(workflow, /firebase deploy|npm run deploy|eas submit/);

console.log('UI-07-A-07 development-only fixture, edge-case, a11y and CI contracts passed.');
