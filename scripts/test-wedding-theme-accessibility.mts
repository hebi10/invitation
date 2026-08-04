import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const sharedGallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const guestbook = read('src/components/sections/Guestbook/GuestbookThemed.tsx');
const schedule = read('src/components/sections/Schedule/ScheduleTabbedThemed.tsx');
const romantic = read('src/app/_components/themeRenderers/romantic.tsx');

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

console.log('웨딩 테마 접근성 계약 검증 통과');
