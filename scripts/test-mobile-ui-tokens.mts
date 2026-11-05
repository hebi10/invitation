import assert from 'node:assert/strict';

import { getFontScale, getPalette, resolveAppColorScheme } from '../apps/mobile/src/constants/theme';
import {
  APP_CONTROL_MIN_HEIGHT,
  APP_SPACING,
  APP_TYPOGRAPHY,
  getScaledTypography,
} from '../apps/mobile/src/constants/uiTokens';

function channelToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string) {
  assert.match(color, /^#[0-9a-f]{6}$/i);
  const channels = [1, 3, 5].map((index) => channelToLinear(Number.parseInt(color.slice(index, index + 2), 16)));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(left: string, right: string) {
  const a = relativeLuminance(left);
  const b = relativeLuminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const scheme of ['light', 'dark'] as const) {
  const palette = getPalette(scheme);
  for (const [label, text, background] of [
    ['page title', palette.text, palette.background],
    ['card title', palette.text, palette.surface],
    ['secondary text', palette.textMuted, palette.surface],
    ['primary button', palette.surface, palette.accent],
    ['secondary button', palette.accent, palette.surface],
    ['accent badge', palette.accent, palette.accentSoft],
    ['success state', palette.success, palette.successSoft],
    ['warning state', palette.notice, palette.noticeSoft],
    ['error state', palette.danger, palette.dangerSoft],
  ]) {
    assert.ok(
      contrastRatio(text, background) >= 4.5,
      `${scheme} ${label}: text contrast should be at least 4.5:1`
    );
  }
}

assert.equal(resolveAppColorScheme('dark', 'system'), 'dark');
assert.equal(resolveAppColorScheme('light', 'dark'), 'dark');
assert.equal(getFontScale('normal'), 1);
assert.equal(getFontScale('large'), 1.12);

assert.ok(APP_CONTROL_MIN_HEIGHT >= 48, 'common controls need a 48dp touch target');
assert.deepEqual(Object.values(APP_SPACING), [8, 12, 16, 24, 32]);

for (const role of Object.keys(APP_TYPOGRAPHY) as Array<keyof typeof APP_TYPOGRAPHY>) {
  const normal = getScaledTypography(role, 1);
  const large = getScaledTypography(role, 1.12);
  assert.ok(typeof normal.fontSize === 'number' && normal.fontSize >= 12, role);
  assert.ok(typeof normal.lineHeight === 'number' && normal.lineHeight >= normal.fontSize, role);
  assert.equal(large.fontSize, normal.fontSize * 1.12, `${role} should follow large-text preference`);
  assert.equal(large.lineHeight, normal.lineHeight * 1.12, `${role} line-height should scale`);
}
console.log('mobile design tokens contract tests passed');
