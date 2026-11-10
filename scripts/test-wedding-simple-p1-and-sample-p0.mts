import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const coverCss = readFileSync('src/app/_components/public-invitations/wedding/WeddingCover.module.css', 'utf8');
const baseCss = readFileSync('src/app/_components/public-invitations/wedding/WeddingBase.module.css', 'utf8');
const design = readFileSync('DESIGN.md', 'utf8');
const publicRoute = readFileSync('src/app/[slug]/[theme]/page.tsx', 'utf8');
const homeSample = readFileSync('src/config/homeWeddingSample.ts', 'utf8');
const homeProvenance = JSON.parse(readFileSync('public/images/home-wedding/provenance.json', 'utf8'));
const legacySeed = readFileSync('src/config/pages/shin-minje-kim-hyunji.ts', 'utf8');

assert.match(coverCss, /\.basic\s*\{\s*background:\s*var\(--paper,\s*#faf9f6\)/);
assert.match(coverCss, /\.basic \.names\s*\{\s*font-family:\s*'Wedding Myeongjo',\s*serif;\s*font-size:\s*26px;\s*font-weight:\s*400/);
assert.match(coverCss, /\.basic \.photoFrame\s*\{\s*width:\s*92%;\s*margin-inline:\s*auto;\s*aspect-ratio:\s*3\s*\/\s*4/);
assert.match(coverCss, /\.editorial \.photoFrame\s*\{\s*aspect-ratio:\s*4\s*\/\s*5/);
assert.match(coverCss, /\.basic \.names\s*\{\s*gap:\s*10px;\s*font-size:\s*clamp\(24px,\s*6\.667vw,\s*26px\)/);
assert.match(baseCss, /\.page\[data-design='simple'\]\s*\{[\s\S]*?--paper:\s*#faf9f6/);
assert.match(design, /표지 사진은 콘텐츠 폭의 92%, 3:4 비율/);
assert.match(design, /표지 이름은 26px\(359px 이하 24px\)/);

for (const selector of ['.photographic', '.editorial', '.traditional', '.letter']) {
  assert.ok(coverCss.includes(selector), 'Theme must remain: ' + selector);
}
assert.match(coverCss, /\.photographic \.photoFrame\s*\{\s*aspect-ratio:\s*2\s*\/\s*3/);
assert.match(publicRoute, /getCachedServerPublicInvitationPageBySlug/);
assert.doesNotMatch(publicRoute, /shinMinjeKimHyunjiConfig|getRequiredWeddingPageBySlug/);

assert.match(homeSample, /slug:\s*'homepage-sample'/);
assert.match(homeSample, /date:\s*'2027년 4월 17일 토요일'/);
assert.match(homeSample, /SAMPLE_WEDDING_COVER/);
assert.equal(homeProvenance.tool, 'built-in image_gen');
const assets = homeProvenance.assets.map((entry: { file: string }) => entry.file);
assert.equal(assets.length, 6);
assert.equal(new Set(assets).size, 6);
assert.ok(assets.includes('portrait.webp'));
assert.ok(assets.includes('bouquet.webp'));
for (const file of assets) {
  assert.ok(homeSample.includes('/images/home-wedding/' + file),
    'Expected isolated fictional sample image: ' + file);
}

assert.match(legacySeed, /slug:\s*'kim-shinlang-na-sinbu'/);
assert.doesNotMatch(legacySeed, /slug:\s*'shin-minje-kim-hyunji'/);

console.log('P0/P1 wedding: simple cover matches design; safe local sample and 4 other themes remain separate from Firestore public sample.');
