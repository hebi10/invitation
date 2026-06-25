import fs from 'node:fs';

import {
  getInvitationThemeDefinition,
  getInvitationThemeSalesPolicy,
  isInvitationThemeKey,
} from '../src/lib/invitationThemes';

const themeKey = 'classic-r';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

assert(isInvitationThemeKey(themeKey), 'classic-r must be registered as an invitation theme.');

const definition = getInvitationThemeDefinition(themeKey);
assert(definition.pathSuffix === '/classic-r', 'classic-r must use /classic-r route suffix.');
assert(definition.label === '클래식 리뉴얼', 'classic-r must expose the Korean display label.');
assert(
  definition.adminLabel === '클래식 리뉴얼',
  'classic-r admin label must be Korean to match the admin selector.'
);
assert(
  definition.variantLabel === '클래식 리뉴얼',
  'classic-r variant label must be Korean to match preview labels.'
);
assert(
  definition.preview.description.includes('프리미엄'),
  'classic-r preview description must communicate the premium positioning.'
);

const policy = getInvitationThemeSalesPolicy(themeKey);
assert(policy.isSelectableAtCreation, 'classic-r must be selectable at creation.');
assert(policy.isPurchasable, 'classic-r must be purchasable.');
assert(policy.allowsAdditionalPurchase, 'classic-r must support additional purchase.');

const registrySource = fs.readFileSync('src/app/_components/themeRenderers/registry.ts', 'utf8');
assert(
  registrySource.includes("key: 'classic-r'"),
  'classic-r must be registered in WEDDING_THEME_RENDERER_REGISTRY.'
);
assert(
  fs.existsSync('src/app/_components/themeRenderers/classic-r.tsx'),
  'classic-r renderer module must exist.'
);

console.log('classic-r theme wiring passed.');
