import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const loader = read('src/components/sections/WeddingLoader/WeddingLoaderMessage.tsx');
const emotionalLoader = read('src/components/sections/WeddingLoader/WeddingLoader.tsx');
const simpleLoader = read('src/components/sections/WeddingLoader/WeddingLoaderSimple.tsx');
const cover = read('src/components/sections/Cover/CoverFramedThemed.tsx');
const layout = read('src/app/_components/EventInvitationLayout.tsx');
const kakaoShare = read('src/app/_components/WeddingKakaoShareButton.tsx');
const emotionalMap = read('src/components/sections/LocationMap/LocationMap.tsx');
const simpleMap = read('src/components/sections/LocationMap/LocationMapSimple.tsx');
const romanticMap = read('src/app/_components/themeRenderers/romanticLocationMap.tsx');
const romantic = read('src/app/_components/themeRenderers/romantic.tsx');
const sharedGallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const romanticCss = read('src/app/_components/themeRenderers/romantic.module.css');
const samples = read('src/config/sampleInvitationDefaults.ts');

assert.doesNotMatch(loader, /minLoadTime/);
assert.doesNotMatch(emotionalLoader, /minLoadTime/);
assert.doesNotMatch(simpleLoader, /minLoadTime/);
assert.match(loader, /transform:\s*`scaleX\(/);
assert.match(cover, /from ['"]next\/image['"]/);
assert.match(cover, /<Image/);
assert.doesNotMatch(layout, /beforeInteractive|<Script/);
assert.match(kakaoShare, /KAKAO_SHARE_SCRIPT_ID/);
assert.match(kakaoShare, /IntersectionObserver/);
assert.match(emotionalMap, /IntersectionObserver/);
assert.match(simpleMap, /IntersectionObserver/);
assert.match(romanticMap, /IntersectionObserver/);
assert.doesNotMatch(romanticCss, /@import\s+url/);
assert.match(romantic, /loading=["']lazy["']/);
assert.match(sharedGallery, /loading=["']lazy["']/);
assert.doesNotMatch(sharedGallery, /onLoadingComplete/);
assert.match(samples, /\.webp/);
assert.ok(
  statSync(path.resolve(process.cwd(), 'public/images/sample-wedding-romantic.webp')).size <
    statSync(path.resolve(process.cwd(), 'public/images/sample-wedding-romantic.png')).size
);
assert.ok(
  statSync(path.resolve(process.cwd(), 'public/images/intro_romantic.webp')).size <
    statSync(path.resolve(process.cwd(), 'public/images/intro_romantic.png')).size
);

console.log('웨딩 테마 성능 계약 검증 통과');
