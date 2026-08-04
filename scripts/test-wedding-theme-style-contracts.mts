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

assert.match(globals, /--accent-brown:/);
for (const css of [...emotionalMotion, ...simpleMotion, romanticCss, classicCss]) {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
}
assert.match(romanticCss, /--romantic-accent-text:/);
assert.match(classicCss, /--classic-muted-readable:/);
assert.match(classicCss, /\[aria-selected=["']true["']\]/);

console.log('웨딩 테마 스타일 계약 검증 통과');
