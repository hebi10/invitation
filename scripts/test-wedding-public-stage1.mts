import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name: string) => readFileSync(name, 'utf8');

const musicCss = read('src/components/media/BackgroundMusic.module.css');
const musicComponent = read('src/components/media/BackgroundMusic.tsx');
const gallery = read('src/components/sections/Gallery/WeddingGallerySwiper.tsx');
const galleryCss = read('src/components/sections/Gallery/WeddingGallerySwiper.module.css');
const weddingCss = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const weddingPage = read('src/app/_components/public-invitations/wedding/WeddingBase.tsx');

assert.match(musicCss, /\.musicPlayer\s*\{[^}]*position:\s*fixed;/s);
assert.match(musicCss, /\.musicPlayer\s*\{[^}]*top:\s*max\(12px,\s*env\(safe-area-inset-top\)\)/s);
assert.doesNotMatch(musicCss, /\.musicPlayer\s*\{[^}]*bottom:/s, 'Music dock must not obstruct bottom copy and sharing');
assert.match(musicCss, /\.toggleButton\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
assert.match(musicCss, /\.controlLabel\s*\{[^}]*position:\s*absolute;/s);
assert.match(musicComponent, /aria-label=\{isPlaying \? '음악 끄기' : errorMessage \? '음악 다시 시도' : '음악 켜기'\}/);
assert.match(musicComponent, /aria-pressed=\{isPlaying\}/);
assert.match(musicComponent, /className=\{styles\.controlIcon\}/);
assert.doesNotMatch(musicComponent, /!hasAutoPlayedRef\.current && !isPlaying && isAtTop/, 'No persistent overlay hint');

const anchors = [...weddingPage.matchAll(/href="#(wedding-[\w-]+)"/g)].map(match => match[1]);
for (const destination of new Set(anchors)) {
  assert.match(weddingPage, new RegExp(`id="${destination}"`), `Broken anchor target: ${destination}`);
}
assert.match(weddingCss, /\.quickLinks\s*\{[^}]*flex-wrap:\s*wrap;/s);
assert.match(weddingCss, /\.quickLinks a\s*\{[^}]*min-height:\s*44px;/s);
assert.match(weddingCss, /\.page \[id\]\s*\{[^}]*scroll-margin-top:\s*max\(72px,/s);

assert.match(gallery, /data-gallery-photo-state=\{failedImages\.has\(src\)/);
assert.match(gallery, /loading=\{imageIndex === 0 \? 'eager' : 'lazy'\}/);
assert.match(gallery, /onLoad=\{\(\) => setLoadedImages/s);
assert.match(gallery, /onError=\{\(\) => setFailedImages/s);
assert.match(gallery, /사진을 불러오지 못했습니다/);
assert.match(gallery, /사진을 불러오는 중/);
assert.match(galleryCss, /\.photoButton\s*\{[^}]*position:\s*relative;/s);
assert.match(galleryCss, /\.loading\s*\{[^}]*pointer-events:\s*none;/s);

console.log('Stage 1 public wedding UI guardrails passed');
