import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const contract = JSON.parse(read('docs/design/ui-08-01-wedding-palettes.json'));
const css = read('src/app/_components/public-invitations/wedding/WeddingBase.module.css');
const intro = read('src/components/sections/WeddingIntro/QuietInvitationTokens.module.css');
const introComponent = read('src/components/sections/WeddingIntro/WeddingIntro.tsx');
const share = read('src/app/_components/weddingThemes.ts');
const gallery = read('src/app/_components/public-invitations/wedding/WeddingGallery.module.css');
const marker = '/* UI-08-02: canonical public wedding palette';
assert.ok(css.includes(marker), 'canonical palette block absent');
const canonical = css.slice(css.indexOf(marker));

function block(source: string, selector: string) {
  const start = source.indexOf(selector + ' {');
  assert.ok(start >= 0, 'missing selector: ' + selector);
  const end = source.indexOf('}', start);
  assert.ok(end > start, 'missing CSS block end: ' + selector);
  return source.slice(start, end + 1);
}
function contrast(foreground: string, background: string) {
  const lum = (hex: string) => {
    const rgb = hex.slice(1).match(/.{2}/g)!.map((value) => {
      const v = parseInt(value, 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const a = lum(foreground);
  const b = lum(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
for (const palette of contract.mapping) {
  const page = block(canonical, `.page[data-design='${palette.id}']`);
  const modal = block(intro, `.quietInvitation[data-theme='${palette.id}']`);
  for (const [token, value] of Object.entries({
    paper: palette.paper, 'paper-soft': palette.paperSoft,
    ink: palette.ink, muted: palette.muted, accent: palette.accent,
    line: palette.line, 'control-line': palette.controlLine,
    focus: palette.focus, 'on-accent': palette.onAccent,
  })) {
    assert.ok(page.includes(`--${token}: ${value};`), `${palette.id}: missing ${token}`);
  }
  for (const [token, value] of Object.entries({
    'qi-paper': palette.paper, 'qi-paper-soft': palette.paperSoft,
    'qi-ink': palette.ink, 'qi-ink-muted': palette.muted,
    'qi-ink-accent': palette.accent, 'qi-line': palette.line,
    'qi-focus': palette.focus,
  })) {
    assert.ok(modal.includes(`--${token}: ${value};`), `${palette.id}: missing intro ${token}`);
  }
  assert.ok(share.includes(`'${palette.id}': { paper: '${palette.paper.toLowerCase()}', ink: '${palette.ink.toLowerCase()}', line: '${palette.line.toLowerCase()}' }`), `${palette.id}: share palette mismatch`);
  assert.ok(contrast(palette.ink, palette.paper) >= 4.5, `${palette.id}: ink contrast under WCAG AA`);
  assert.ok(contrast(palette.onAccent, palette.accent) >= 4.5, `${palette.id}: button contrast under WCAG AA`);
}
assert.ok(introComponent.includes('data-wedding-intro-pending="true"\\n          data-theme={theme}'), 'pending intro missing its selected theme');
assert.ok(gallery.includes('background: var(--paper-soft, #f0ede7);'), 'shared gallery fallback does not inherit theme');
assert.ok(gallery.includes('color: var(--ink, #282725);'), 'shared gallery foreground does not inherit theme');
assert.ok(!gallery.includes('background: #eef1e8;'), 'hard-coded garden green leaks into shared gallery');
for (const selector of ['.formSummary', '.submitButton', '.contactActions a']) {
  assert.ok(canonical.includes(selector), `missing public UI token application for ${selector}`);
}
console.log('UI-08-02: all five palettes, intro, share, gallery and CTA contrast contracts passed');
