import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const sharedGallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const guestbook = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const giftInfoThemed = read('src/components/sections/GiftInfo/GiftInfoThemed.tsx');
const dateFeature = read(
  'src/app/_components/public-invitations/shared/PublicInvitationDateFeature.tsx'
);
const dateFeatureCss = read(
  'src/app/_components/public-invitations/shared/PublicInvitationDateFeature.module.css'
);
const storedContent = read(
  'src/app/_components/public-invitations/shared/WeddingStoredContent.tsx'
);
const storedContentCss = read(
  'src/app/_components/public-invitations/shared/WeddingStoredContent.module.css'
);
const activeWeddingPages = [read('src/app/_components/public-invitations/wedding/WeddingBase.tsx')];

assert.match(sharedGallery, /role=["']dialog["']/);
assert.match(sharedGallery, /aria-modal=["']true["']/);
assert.match(sharedGallery, /lastFocusedElementRef|triggerRef/);
assert.match(sharedGallery, /aria-label=.*사진/);
assert.match(sharedGallery, /onKeyDown=.*handle.*KeyDown|handleDialogKeyDown/);

assert.match(guestbook, /useId\(/);
assert.match(guestbook, /htmlFor=/);
assert.match(guestbook, /role=["']status["']/);
assert.match(guestbook, /role=["']alert["']/);

assert.match(giftInfoThemed, /aria-label=.*account\.accountHolder.*copyLabel/);
assert.match(dateFeature, /<section[\s\S]*?aria-label=\{title\}/);
assert.match(dateFeature, /<h2 className=/);
assert.match(dateFeature, /<time[\s\S]*?dateTime=\{model\.dateTime\}/);
assert.match(dateFeature, /aria-current=\{day === model\.eventDay \? 'date' : undefined\}/);
assert.match(storedContent, /aria-labelledby="wedding-stored-content-title"/);
assert.match(storedContent, /aria-label="예식장에 전화하기"/);
assert.match(storedContent, /target="_blank"[\s\S]*?rel="noreferrer"/);
assert.match(dateFeatureCss, /\.eventDay\s*\{[^}]*border:\s*1px solid currentColor;/s);
assert.match(storedContentCss, /\.action\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
assert.match(storedContentCss, /\.action:focus-visible\s*\{/);

for (const page of activeWeddingPages) {
  assert.match(page, /<PublicInvitationDateFeature/);
  assert.match(page, /mode="calendar-countdown"/);
  assert.match(page, /<WeddingStoredContent/);
  assert.doesNotMatch(page, /<WeddingLoader|<IntroScreen/);
}

console.log('웨딩 테마 접근성 계약 검증 통과');
