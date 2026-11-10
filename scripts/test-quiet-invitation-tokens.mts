import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(
  'src/components/sections/WeddingIntro/QuietInvitationTokens.module.css',
  'utf8'
);
const design = readFileSync('docs/design/quiet-invitation-intro-design-system.md', 'utf8');
const existingRenderer = readFileSync('src/components/sections/WeddingIntro/WeddingIntro.tsx', 'utf8');
const policy = readFileSync('src/lib/weddingIntro.ts', 'utf8');

function getToken(name: string) {
  const pattern = new RegExp('--' + name + ':\\s*([^;]+);');
  const match = css.match(pattern);
  assert.ok(match, 'Missing Quiet Invitation token: ' + name);
  return match[1]!.trim();
}

function luminance(hex: string) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const values = [1, 3, 5].map(index =>
    Number.parseInt(hex.slice(index, index + 2), 16) / 255
  );
  const linear = values.map(value =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(a: string, b: string) {
  const higher = Math.max(luminance(a), luminance(b));
  const lower = Math.min(luminance(a), luminance(b));
  return (higher + 0.05) / (lower + 0.05);
}

assert.match(css, /\.quietInvitation\s*\{/);
for (const style of ['light', 'cinema', 'envelope']) {
  assert.ok(css.includes("[data-intro-style='" + style + "']"), 'Missing style: ' + style);
  assert.ok(policy.includes("'" + style + "'"), 'Existing saved style key must remain');
  assert.ok(design.includes(style), 'Missing style in design spec: ' + style);
}

for (const token of [
  'qi-paper', 'qi-paper-soft', 'qi-paper-card', 'qi-ink', 'qi-ink-muted',
  'qi-ink-accent', 'qi-line', 'qi-focus', 'qi-photo-surface',
  'qi-photo-ink', 'qi-photo-muted', 'qi-photo-overlay',
  'qi-font-heading', 'qi-font-ui', 'qi-font-heading-size',
  'qi-inline-gutter', 'qi-content-max', 'qi-hit-size',
  'qi-motion-ease', 'qi-motion-enter', 'qi-motion-exit',
  'qi-motion-stagger', 'qi-motion-translate',
  'qi-motion-light-total', 'qi-motion-cinema-total',
  'qi-motion-envelope-after-tap',
]) {
  getToken(token);
}

for (const [foreground, background, minimum] of [
  ['qi-ink', 'qi-paper', 4.5],
  ['qi-ink-muted', 'qi-paper', 4.5],
  ['qi-ink-accent', 'qi-paper', 4.5],
  ['qi-focus', 'qi-paper', 3],
  ['qi-photo-ink', 'qi-photo-surface', 4.5],
  ['qi-photo-muted', 'qi-photo-surface', 4.5],
] as const) {
  const ratio = contrastRatio(getToken(foreground), getToken(background));
  assert.ok(ratio >= minimum,
    foreground + ' contrast ' + ratio.toFixed(2) + ' must reach ' + minimum + ':1');
}

assert.equal(getToken('qi-hit-size'), '48px');
assert.equal(getToken('qi-content-max'), '480px');
assert.equal(getToken('qi-motion-light-total'), '1400ms');
assert.equal(getToken('qi-motion-cinema-total'), '1600ms');
assert.equal(getToken('qi-motion-envelope-after-tap'), '1100ms');

assert.match(css, /@media \(max-width: 359px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /--qi-motion-enter: 0ms/);
assert.match(css, /--qi-motion-cinema-total: 0ms/);
assert.doesNotMatch(css, /\b(?:box-shadow|perspective|clip-path|filter|background-image)\s*:/);
assert.doesNotMatch(css, /linear-gradient\(|radial-gradient\(/);
assert.match(design, /introStyle/);
assert.match(design, /Firebase/);

// 2-A wires the existing 1-A design tokens to the production renderer.
assert.match(existingRenderer, /import tokens from '\.\/QuietInvitationTokens\.module\.css'/);
assert.match(existingRenderer, /data-intro-style=\{style\}/);
assert.match(existingRenderer, /tokens\.quietInvitation/);
assert.match(existingRenderer, /loading="eager"/);
assert.match(existingRenderer, /fetchPriority="high"/);
assert.match(policy, /'none' \| 'light' \| 'cinema' \| 'envelope'/);

console.log('Quiet Invitation 1-A token coverage, static contrast, motion and no-live-UI-change checks passed');
