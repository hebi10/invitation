import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const globals = read('src/app/globals.css');
const emotionalMotion = [
  'src/components/sections/WeddingCalendar/WeddingCalendar.module.css',
  'src/components/sections/Guestbook/Guestbook.module.css',
  'src/components/sections/LocationMap/LocationMap.module.css',
].map(read);
const simpleMotion = [
  'src/components/sections/Schedule/ScheduleSimple.module.css',
  'src/components/sections/Gallery/GallerySimple.module.css',
].map(read);
const romanticCss = read('src/app/_components/themeRenderers/romantic.module.css');
const classicCss = read('src/app/_components/themeRenderers/classic-r.module.css');
const letterpressCss = read(
  'src/app/_components/public-invitations/wedding/letterpress/styles.module.css'
);

assert.match(globals, /--accent-brown:/);
for (const css of [...emotionalMotion, ...simpleMotion, romanticCss, classicCss]) {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
}
assert.match(romanticCss, /--romantic-accent-text:/);
assert.match(classicCss, /--classic-muted-readable:/);
assert.match(classicCss, /\[aria-selected=["']true["']\]/);
assert.doesNotMatch(
  letterpressCss,
  /border-radius:\s*(?:[1-9]|\d{2,})px|border-radius:\s*999px/
);
assert.doesNotMatch(letterpressCss, /box-shadow/);
assert.doesNotMatch(letterpressCss, /gradient\(/);
assert.match(letterpressCss, /min-height:\s*44px/);
assert.match(letterpressCss, /:focus-visible/);
assert.match(letterpressCss, /prefers-reduced-motion:\s*reduce/);
assert.match(
  letterpressCss,
  /\.popupLoadingText\s*\{[^}]*color:\s*var\(--paper\);[^}]*\}/s,
  'Letterpress gallery popup loading copy must use a light foreground on the dark modal.'
);
assert.match(
  letterpressCss,
  /\.popup\s+:is\(\.closeButton,\s*\.navArrow\):focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--paper\);[^}]*\}/s,
  'Letterpress gallery modal controls must use a high-contrast light focus ring.'
);

console.log('웨딩 테마 스타일 계약 검증 통과');
