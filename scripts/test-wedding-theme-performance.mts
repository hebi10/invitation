import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const sharedGallery = read('src/components/sections/Gallery/GalleryGridShared.tsx');
const registry = read('src/app/_components/themeRenderers/registry.ts');
const revealHook = read(
  'src/app/_components/public-invitations/wedding/useImmediateWeddingPageReveal.ts'
);
const samples = read('src/config/sampleInvitationDefaults.ts');
const activePagePaths = [
  'letterpress',
  'portrait-letter',
  'garden-note',
  'quiet-ceremony',
].map(
  (theme) =>
    `src/app/_components/public-invitations/wedding/${theme}/Page.tsx`
);
const activePages = activePagePaths.map(read);

assert.match(sharedGallery, /loading=["']lazy["']/);
assert.doesNotMatch(sharedGallery, /onLoadingComplete/);
assert.match(registry, /component:\s*PortraitLetterPage/);
assert.match(registry, /component:\s*GardenNotePage/);
assert.match(registry, /component:\s*QuietCeremonyPage/);
assert.match(registry, /component:\s*LetterpressPage/);

for (const page of activePages) {
  assert.match(page, /loading="eager"/);
  assert.doesNotMatch(page, /minLoadTime|setTimeout|<WeddingLoader|<IntroScreen/);
  assert.match(page, /<GalleryGridShared/);

  assert.match(page, /useImmediateWeddingPageReveal\(state\);/);
}

assert.match(revealHook, /setIsLoading\(false\);/);
assert.match(revealHook, /window\.requestAnimationFrame\(releasePageOverflow\)/);
assert.match(revealHook, /window\.cancelAnimationFrame\(frame\);/);
assert.doesNotMatch(revealHook, /setTimeout|minLoadTime/);
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
