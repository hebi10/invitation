import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const sharedGallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const guestbook = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const schedule = read('src/components/sections/Schedule/ScheduleTabbedThemed.tsx');
const romantic = read('src/app/_components/themeRenderers/romantic.tsx');
const romanticCss = read('src/app/_components/themeRenderers/romantic.module.css');
const calendar = read(
  'src/components/sections/WeddingCalendar/WeddingCalendarInteractive.tsx'
);
const calendarCss = read(
  'src/components/sections/WeddingCalendar/WeddingCalendarSimple.module.css'
);
const giftInfo = read('src/components/sections/GiftInfo/GiftInfo.tsx');
const giftInfoThemed = read('src/components/sections/GiftInfo/GiftInfoThemed.tsx');

const readRemFontSize = (css: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'))?.[1];
  assert.ok(block, `${selector} 스타일 블록을 찾을 수 없습니다.`);

  const fontSize = block.match(/font-size:\s*([\d.]+)rem;/)?.[1];
  assert.ok(fontSize, `${selector}의 rem 글자 크기를 찾을 수 없습니다.`);

  return Number(fontSize);
};

assert.match(sharedGallery, /role=["']dialog["']/);
assert.match(sharedGallery, /aria-modal=["']true["']/);
assert.match(sharedGallery, /lastFocusedElementRef|triggerRef/);
assert.match(sharedGallery, /aria-label=.*사진/);
assert.match(sharedGallery, /onKeyDown=.*handle.*KeyDown|handleDialogKeyDown/);

assert.match(guestbook, /useId\(/);
assert.match(guestbook, /htmlFor=/);
assert.match(guestbook, /role=["']status["']/);
assert.match(guestbook, /role=["']alert["']/);

assert.match(schedule, /role=["']tablist["']/);
assert.match(schedule, /aria-controls=/);
assert.match(schedule, /aria-labelledby=/);
assert.match(schedule, /tabIndex=/);
assert.match(schedule, /ArrowLeft|ArrowRight/);

assert.match(romantic, /role=["']dialog["']/);
assert.match(romantic, /aria-modal=["']true["']/);
assert.match(romantic, /aria-controls=/);
assert.match(romantic, /ArrowLeft|ArrowRight/);
assert.match(romantic, /aria-label=.*account\.accountHolder.*계좌 복사/);

assert.doesNotMatch(calendar, /<h4 className=\{styles\.monthTitle\}>/);
assert.match(calendar, /<h3 className=\{styles\.monthTitle\}>/);
assert.match(giftInfo, /aria-label=.*account\.accountHolder.*계좌번호 복사/);
assert.match(giftInfoThemed, /aria-label=.*account\.accountHolder.*copyLabel/);

assert.doesNotMatch(
  romanticCss,
  /font-size:\s*0\.(?:62|64|66|68)rem;/,
  'Romantic의 정보성 보조 문구는 0.75rem 미만으로 축소하지 않습니다.'
);
[
  '.calendarDay',
  '.countdownTimeLabel',
  '.accountInfo',
  '.copyButton',
  '.label',
  '.commentDate',
  '.deleteButton',
].forEach((selector) => {
  assert.ok(
    readRemFontSize(romanticCss, selector) >= 0.75,
    `${selector}의 정보 또는 동작 문구는 최소 0.75rem이어야 합니다.`
  );
});
assert.match(calendarCss, /\.weekday:first-child\s*\{[^}]*color:\s*#b42318;/s);
assert.match(calendarCss, /\.weekday:last-child\s*\{[^}]*color:\s*#0057b8;/s);
assert.match(calendarCss, /\.weddingDay \.dayNumber\s*\{[^}]*color:\s*#b42318;/s);

console.log('웨딩 테마 접근성 계약 검증 통과');
