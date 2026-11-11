import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const css = read('src/components/sections/WeddingIntro/WeddingIntro.module.css');
const tokens = read('src/components/sections/WeddingIntro/QuietInvitationTokens.module.css');
const component = read('src/components/sections/WeddingIntro/WeddingIntro.tsx');
const policy = read('src/lib/weddingIntro.ts');

for (const theme of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.ok(tokens.includes(`.quietInvitation[data-theme='${theme}']`), `Missing palette for ${theme}`);
}
for (const theme of ['simple', 'classic-r', 'romantic', 'gyeol', 'emotional']) {
  assert.ok(css.includes(`.backdrop[data-theme='${theme}']`), `Missing intro theme treatment for ${theme}`);
}
for (const animation of ['invitationLineGlow', 'invitationCardFloat', 'invitationPetalDrift', 'invitationActionBreathe', 'invitationLabelGlint']) {
  assert.ok(css.includes(`@keyframes ${animation}`), `Missing intro motion: ${animation}`);
}
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
assert.match(css, /pointer-events: none;/);
assert.match(component, /onClick=\{\(\) => openLetterRef\.current\(\)\}/);
assert.match(component, /onClick=\{complete\}/);
assert.match(component, /data-theme=\{theme\}/);
assert.match(component, /data-intro-opening=\{opening \? 'true' : 'false'\}/);
assert.match(component, /sessionStorage\.setItem/);
assert.match(component, /if \(finished\.current\) return/);
assert.match(policy, /shouldShowWeddingIntro/);
console.log('UI-08-04: 5 palettes, intro choreography, escape/reduced motion and completion contracts passed');
