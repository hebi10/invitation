import fs from 'node:fs';

import {
  getInvitationThemeDefinition,
  getInvitationThemeSalesPolicy,
  isInvitationThemeKey,
} from '../src/lib/invitationThemes.ts';

const themeKey = 'classic-r';
const letterpressPagePath =
  'src/app/_components/public-invitations/wedding/letterpress/Page.tsx';
const weddingIndexPath = 'src/app/_components/public-invitations/wedding/index.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

assert(isInvitationThemeKey(themeKey), 'classic-r must be registered as an invitation theme.');

const definition = getInvitationThemeDefinition(themeKey);
assert(definition.pathSuffix === '/classic-r', 'classic-r must use /classic-r route suffix.');
assert(definition.label === '모던형', 'classic-r must expose the Letterpress display label.');
assert(
  definition.adminLabel === '모던형',
  'classic-r admin label must be Korean to match the admin selector.'
);
assert(
  definition.variantLabel === '모던형',
  'classic-r variant label must be Korean to match preview labels.'
);
assert(
  definition.preview.description.includes('잡지처럼'),
  'classic-r preview description must describe the Letterpress visual world.'
);

const policy = getInvitationThemeSalesPolicy(themeKey);
assert(policy.isSelectableAtCreation, 'classic-r must be selectable at creation.');
assert(policy.isPurchasable, 'classic-r must be purchasable.');
assert(policy.allowsAdditionalPurchase, 'classic-r must support additional purchase.');

const registrySource = fs.readFileSync('src/app/_components/themeRenderers/registry.ts', 'utf8');
const weddingIndexSource = fs.readFileSync(weddingIndexPath, 'utf8');
assert(
  registrySource.includes("key: 'classic-r'"),
  'classic-r must be registered in WEDDING_THEME_RENDERER_REGISTRY.'
);
assert(
  registrySource.includes("from '../public-invitations/wedding'"),
  'wedding registry renderers must originate from public-invitations/wedding.'
);
assert(
  fs.existsSync(letterpressPagePath),
  'classic-r must use the dedicated Letterpress page module.'
);
assert(
  weddingIndexSource.includes("export { default as LetterpressPage } from './letterpress/Page';"),
  'the wedding public boundary must export the dedicated Letterpress page.'
);
assert(
  /key:\s*['"]classic-r['"][\s\S]*?component:\s*LetterpressPage/.test(registrySource),
  'classic-r must resolve to LetterpressPage in the wedding theme registry.'
);

const wrapper = fs.readFileSync(letterpressPagePath, 'utf8');
assert(wrapper.includes('theme="classic-r"'), 'classic-r wrapper must pass its actual theme key.');
const base = fs.readFileSync('src/app/_components/public-invitations/wedding/WeddingBase.tsx', 'utf8');
for (const contract of ['getThemePageData(page, theme)', 'getCeremonySchedule', 'getCeremonyAddress', 'shouldShowGiftInfo', '<GalleryGridShared', '<GuestbookThemed', '<GiftInfoThemed', '<PublicInvitationDateFeature', '<WeddingStoredContent', 'useImmediateWeddingPageReveal(state)']) {
  assert(base.includes(contract), 'Shared wedding base must preserve ' + contract);
}
assert(/state\.galleryImageUrls\.length\s*>\s*0/.test(base), 'Empty gallery must remain absent.');
const cover = fs.readFileSync('src/app/_components/public-invitations/wedding/WeddingCover.tsx', 'utf8');
assert(cover.includes("theme === 'classic-r'"), 'Editorial layout must have a dedicated cover branch.');
assert(cover.includes('styles.editorialNames'), 'Editorial layout must retain its separate typographic composition.');
console.log('classic-r theme wiring passed.');
