import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');
const carousel = read('src/components/sections/Gallery/WeddingGallerySwiper.tsx');
const wedding = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');
const gallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const dialog = read('src/hooks/useDialogLayer.ts');

assert.match(carousel, /<Swiper\s+role="region"/, 'Swiper needs an explicit labelled landmark role');
assert.match(carousel, /className=\{styles\.companions\} role="group" aria-label="다른 사진 선택"/);
assert.match(carousel, /<span role="status" aria-live="polite" aria-atomic="true" aria-label=/);
for (const className of ['photoDate', 'classicDate', 'gardenDate']) {
  assert.match(wedding, new RegExp('className=\\{styles\\.' + className + '\\} role="group" aria-label=\\{page\\.date\\}'));
}
assert.match(carousel, /onOpen\(imageIndex, event\.currentTarget\)/);
assert.match(gallery, /role="dialog"\s+aria-modal="true"/);
assert.match(gallery, /aria-label="갤러리 크게 보기 닫기"/);
assert.match(gallery, /const closePopup = useCallback\(/);
assert.match(gallery, /event\.key === 'ArrowRight'/);
assert.match(dialog, /if \(event\.key === 'Escape'\)/);
assert.match(dialog, /if \(event\.shiftKey && index <= 0\)/);
assert.match(dialog, /if \(wasTop && previousFocus\?\.isConnected\) previousFocus\.focus\(\)/);
assert.match(wedding, /aria-label="청첩장 바로가기"/);
assert.match(wedding, /aria-label="예식 정보 다시 보기"/);
assert.match(wedding, /<WeddingCalendarDownload/);
assert.match(wedding, /<GuestbookThemed/);

console.log('Wedding Stage 5 labelled roles and focus/keyboard safety contracts passed');
