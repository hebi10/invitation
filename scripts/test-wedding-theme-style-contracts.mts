import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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
  assert.equal(
    existsSync(path.resolve(process.cwd(), themePath, 'styles.module.css')),
    true,
    `${themePath} should own dedicated styles`
  );
}

const activeThemeCss = activeThemePaths.map((themePath) =>
  read(`${themePath}/styles.module.css`)
);
const activeThemePages = activeThemePaths.map((themePath) =>
  read(`${themePath}/Page.tsx`)
);
const letterpressCss = activeThemeCss[0];
const narrativeThemeCss = activeThemeCss.slice(1);
const narrativeThemePages = activeThemePages.slice(1);
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
  /\.canvas\s*\{[^}]*width:\s*min\(100%,\s*640px\);[^}]*margin:\s*0 auto;/s,
  'The shared closing canvas should match the centered 640px invitation width'
);

const closingThemeTokens = {
  emotional: ['#f6f1e8', '#29251f', '#b8aa99', '#655c51'],
  romantic: ['#f3f1e6', '#263129', '#aab5a7', '#5a675d'],
  simple: ['#f7f7f4', '#1f211f', '#b7bab4', '#5d615c'],
  'classic-r': ['#f3efe6', '#2c2822', '#b9ae9d', '#686056'],
  gyeol: ['#f3f0e8', '#171916', '#a7ab9f', '#555950'],
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
  assert.match(
    css,
    /\.page\s*\{[^}]*width:\s*min\(100%,\s*640px\);[^}]*margin:\s*0 auto;/s,
    'Every wedding theme should use a centered 640px public invitation canvas'
  );
}

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

for (const css of narrativeThemeCss) {
  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/);
  assert.doesNotMatch(css, /box-shadow/);
  assert.doesNotMatch(css, /border-radius:\s*999px/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);

  const controlLine = css.match(/--control-line:\s*(#[0-9a-f]{6})/i)?.[1];
  const inputSurface = css.match(/--input-surface:\s*(#[0-9a-f]{6})/i)?.[1];

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

for (const page of narrativeThemePages) {
  assert.match(page, /useImmediateWeddingPageReveal/);
  assert.match(page, /useImmediateWeddingPageReveal\(state\);/);
  assert.doesNotMatch(page, /useEffect|removeProperty\(['"]overflow['"]\)/);
}

for (const page of activeThemePages) {
  assert.match(page, /<PublicInvitationDateFeature/);
  assert.match(page, /<WeddingStoredContent/);
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

assert.match(
  narrativeThemeCss[0],
  /\.portraitHero\s*\{[^}]*min-height:\s*100svh/s,
  'Portrait Letter should open with a full-height portrait scene'
);
assert.match(
  narrativeThemeCss[1],
  /\.botanicalLine\s*\{/,
  'Garden Note should own one restrained botanical line ornament'
);
assert.doesNotMatch(
  narrativeThemeCss[1],
  /flower|floral/i,
  'Garden Note must not introduce flower decoration'
);
assert.match(
  narrativeThemeCss[2],
  /\.informationHero\s*\{/,
  'Quiet Ceremony should own an information-first no-image hero'
);

console.log('웨딩 테마 스타일 계약 검증 통과');
