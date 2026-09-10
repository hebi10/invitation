import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { lastHexToken, readWeddingStyles } from './wedding-style-test-helpers.mts';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

function parseHexColor(value: string) {
  const hex = value.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function relativeLuminance(color: string) {
  const channels = parseHexColor(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

const activeThemePaths = [
  'src/app/_components/public-invitations/wedding/letterpress',
  'src/app/_components/public-invitations/wedding/portrait-letter',
  'src/app/_components/public-invitations/wedding/garden-note',
  'src/app/_components/public-invitations/wedding/quiet-ceremony',
  'src/app/_components/public-invitations/wedding/gyeol',
] as const;

for (const themePath of activeThemePaths) {
  assert.equal(
    existsSync(path.resolve(process.cwd(), themePath, 'Page.tsx')),
    true,
    `${themePath} should own a dedicated page`
  );
  const page = read(themePath + '/Page.tsx');
  assert.match(page, /import WeddingBase from ['"]\.\.\/WeddingBase['"]/);
  assert.match(page, /<WeddingBase \{\.\.\.props\} theme="(?:emotional|romantic|simple|classic-r|gyeol)"/);
}

const activeThemeCss = [readWeddingStyles('src/app/_components/public-invitations/wedding/WeddingBase.module.css')];
const activeThemePages = [read('src/app/_components/public-invitations/wedding/WeddingBase.tsx')];
const coverSource = read('src/app/_components/public-invitations/wedding/WeddingCover.tsx');
const coverCss = read('src/app/_components/public-invitations/wedding/WeddingCover.module.css');
const sharedBaseRule = activeThemeCss[0].match(/\.page\s*\{([^}]*)\}/s)?.[1] ?? '';
for (const theme of ['simple', 'emotional', 'romantic', 'classic-r', 'gyeol']) {
  const themeRule = activeThemeCss[0].match(new RegExp(`\\.page\\[data-design=['"]${theme}['"]\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const palette = sharedBaseRule + themeRule;
  const paper = lastHexToken(palette, 'paper');
  const muted = lastHexToken(palette, 'muted');
  const control = lastHexToken(palette, 'control-line');
  const input = lastHexToken(palette, 'input-surface');
  assert.ok(paper && muted && control && input, `${theme} must resolve its shared and overridden palette`);
  assert.ok(contrastRatio(paper, muted) >= 4.5, `${theme} secondary text must remain readable`);
  assert.ok(contrastRatio(control, input) >= 3, `${theme} form boundaries must remain distinguishable`);
}
const dateFeatureCss = read(
  'src/app/_components/public-invitations/shared/PublicInvitationDateFeature.module.css'
);
const storedContentCss = read(
  'src/app/_components/public-invitations/shared/WeddingStoredContent.module.css'
);
const revealHookPath =
  'src/app/_components/public-invitations/wedding/useImmediateWeddingPageReveal.ts';
const weddingRendererSource = read('src/app/_components/weddingPageRenderers.tsx');
const weddingRegistrySource = read('src/app/_components/themeRenderers/registry.ts');
const weddingClosingPath = 'src/app/_components/WeddingClosing.tsx';
const weddingClosingCssPath = 'src/app/_components/WeddingClosing.module.css';

assert.equal(
  existsSync(path.resolve(process.cwd(), weddingClosingPath)),
  true,
  'WeddingClosing should exist as the shared last-slot component'
);
assert.equal(
  existsSync(path.resolve(process.cwd(), weddingClosingCssPath)),
  true,
  'WeddingClosing should own independent themed styling'
);

const weddingClosingSource = read(weddingClosingPath);
const weddingClosingCss = read(weddingClosingCssPath);
const closingBaseRule = weddingClosingCss.match(/\.closing\s*\{([^}]*)\}/s)?.[1];

assert.ok(closingBaseRule, 'WeddingClosing should define its base visual contract');
assert.doesNotMatch(
  closingBaseRule,
  /--closing-(?:background|foreground|line|muted):/,
  'The closing element must not override themed custom properties inherited from its canvas'
);

assert.match(weddingRendererSource, /<WeddingClosing/);
assert.match(weddingRegistrySource, /withWeddingClosing/);
assert.match(weddingRegistrySource, /getWeddingThemeClosingDefinition/);
assert.match(weddingClosingSource, /data-wedding-closing/);
assert.match(weddingClosingSource, /귀한 걸음과 따뜻한 마음에 감사드립니다/);
assert.match(
  weddingClosingCss,
  /\.canvas\s*\{[^}]*width:\s*min\(100%,\s*480px\);[^}]*margin:\s*0 auto;/s,
  'The shared closing canvas should match the centered 480px invitation width'
);

const closingThemeTokens = {
  emotional: ['#fcfaf6', '#3e3730', '#e6ded3', '#74695d'],
  romantic: ['#ffffff', '#344037', '#dce4d7', '#657064'],
  simple: ['#ffffff', '#292c2a', '#dce0db', '#676d68'],
  'classic-r': ['#ffffff', '#362f27', '#ded5c7', '#71665b'],
  gyeol: ['#faf8f3', '#38363e', '#e4dfe9', '#706b78'],
} as const;

for (const [theme, tokens] of Object.entries(closingThemeTokens)) {
  const themeRule = weddingClosingCss.match(
    new RegExp(`\\.canvas\\[data-theme=['"]${theme}['"]\\]\\s*\\{([^}]*)\\}`)
  )?.[1];

  assert.ok(themeRule, `${theme} should define an explicit closing canvas variant`);

  for (const token of tokens) {
    assert.match(
      themeRule,
      new RegExp(token),
      `${theme} closing should use its public invitation palette token ${token}`
    );
  }
}

assert.doesNotMatch(weddingClosingCss, /box-shadow|border-radius/);
assert.doesNotMatch(weddingClosingCss, /font-weight:\s*(?:8\d{2}|9\d{2})/);

assert.equal(
  existsSync(path.resolve(process.cwd(), revealHookPath)),
  true,
  'Narrative wedding pages should share the parent-effect-safe immediate reveal contract'
);

const revealHook = read(revealHookPath);

for (const css of activeThemeCss) {
  const canvasWidth = 480;
  assert.match(
    css,
    new RegExp(`\\.page\\s*\\{[^}]*width:\\s*min\\(100%,\\s*${canvasWidth}px\\);[^}]*margin:\\s*0 auto;`, 's'),
    'Every wedding theme should use its centered public invitation canvas'
  );
}

for (const css of activeThemeCss) {
  assert.match(css, /\.popupLoadingText,\s*\.popup \.imageCounter\s*\{[^}]*color:\s*var\(--popup-text\);/s);
  assert.match(css, /\.popup button:focus-visible\s*\{[^}]*outline-color:\s*#fff;/s);
}

for (const css of activeThemeCss) {
  assert.doesNotMatch(css.replace(/\.heroCopy\s*\{[^}]*\}/s, ''), /(?:linear|radial|conic)-gradient/);
  assert.doesNotMatch(css, /box-shadow/);
  assert.doesNotMatch(css, /border-radius:\s*999px/);
  assert.doesNotMatch(css, /border-radius:\s*[1-9]\d*px/);
  assert.doesNotMatch(css, /width:\s*min\(100%,\s*640px\)/);
  assert.match(css, /font-size:\s*14px/);
  assert.match(css, /padding:\s*86px 30px 0/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  const controlLine = lastHexToken(css, 'control-line');
  const inputSurface = lastHexToken(css, 'input-surface');
  const paper = lastHexToken(css, 'paper');
  const muted = lastHexToken(css, 'muted');
  assert.ok(paper && muted, 'Each theme must retain readable secondary text on its own palette');
  assert.ok(contrastRatio(paper, muted) >= 4.5, 'Secondary text should meet AA contrast');

  assert.ok(controlLine, 'Narrative wedding themes should define a dedicated control boundary');
  assert.ok(inputSurface, 'Narrative wedding themes should define an input surface');
  assert.ok(
    contrastRatio(controlLine, inputSurface) >= 3,
    'Guestbook control boundaries should meet 3:1 non-text contrast'
  );
  assert.match(
    css,
    /\.input,\s*\.textarea\s*\{[^}]*border:\s*1px solid var\(--control-line\);[^}]*background:\s*var\(--input-surface\);/s,
    'Guestbook inputs should use the dedicated accessible control boundary'
  );
}

for (const css of [dateFeatureCss, storedContentCss]) {
  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/);
  assert.doesNotMatch(css, /box-shadow/);
  assert.doesNotMatch(css, /border-radius/);
}
assert.match(storedContentCss, /min-height:\s*44px/);
assert.match(storedContentCss, /:focus-visible/);
assert.match(dateFeatureCss, /\.eventDay\s*\{[^}]*font-weight:\s*700;/s);

for (const page of activeThemePages) {
  assert.match(page, /useImmediateWeddingPageReveal/);
  assert.match(page, /useImmediateWeddingPageReveal\(state\);/);
  assert.doesNotMatch(page, /useEffect|removeProperty\(['"]overflow['"]\)/);
}

for (const page of activeThemePages) {
  assert.match(page, /<PublicInvitationDateFeature/);
  assert.match(page, /<WeddingStoredContent/);
  assert.match(page, /<LocationMap/);
  assert.match(page, /layout=\{theme === 'romantic' \|\| theme === 'classic-r' \? 'grid' : 'carousel'\}/);
  assert.match(page, /collapsibleAccounts/);
  assert.match(page, /collapsibleForm/);
  assert.match(page, /<details/);
  assert.doesNotMatch(page, /from ['"]\.\.\/letterpress\/styles\.module\.css/);
}

assert.match(revealHook, /setIsLoading\(false\);/);
assert.match(
  revealHook,
  /releasePageOverflow\(\);\s*const frame = window\.requestAnimationFrame\(releasePageOverflow\);/s,
  'Immediate reveal should release overflow again after parent effects run'
);
assert.match(revealHook, /window\.cancelAnimationFrame\(frame\);/);
assert.doesNotMatch(
  revealHook,
  /if\s*\([^)]*imagesLoading|imagesLoading\s*\?/,
  'Immediate reveal must not wait for images before releasing the page'
);

for (const theme of ['romantic', 'emotional', 'classic-r', 'gyeol']) {
  assert.ok(coverSource.includes("theme === '" + theme + "'"));
}
for (const layout of ['basic', 'photographic', 'letter', 'editorial', 'traditional']) {
  assert.ok(coverSource.includes('styles.' + layout));
  assert.ok(coverCss.includes('.' + layout));
}
assert.match(coverSource, /imageUrl \?/);
assert.doesNotMatch(coverCss.replace(/\.photoCopy\s*\{[^}]*\}/s, ''), /(?:linear|radial|conic)-gradient/);
assert.doesNotMatch(coverCss, /box-shadow|font-weight:\s*[89]\d{2}/);
console.log('웨딩 테마 스타일 계약 검증 통과');
