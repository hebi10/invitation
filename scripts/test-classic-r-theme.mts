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
assert(definition.label === '레터프레스', 'classic-r must expose the Letterpress display label.');
assert(
  definition.adminLabel === '레터프레스',
  'classic-r admin label must be Korean to match the admin selector.'
);
assert(
  definition.variantLabel === '레터프레스',
  'classic-r variant label must be Korean to match preview labels.'
);
assert(
  definition.preview.description.includes('고전 활자와 얇은 선'),
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

const letterpressPageSource = fs.readFileSync(letterpressPagePath, 'utf8');
for (const requiredContract of [
  'InvitationPoster',
  'getThemePageData',
  'getCeremonySchedule',
  'getCeremonyAddress',
  'shouldShowGiftInfo',
]) {
  assert(
    letterpressPageSource.includes(requiredContract),
    `Letterpress page must consume ${requiredContract}.`
  );
}
assert(
  /useEffect\([\s\S]*?setIsLoading\(false\)/.test(letterpressPageSource),
  'Letterpress page must immediately release the existing page loading state.'
);
assert(
  /document\.body\.style\.removeProperty\(['"]overflow['"]\)/.test(
    letterpressPageSource
  ) &&
    /document\.documentElement\.style\.removeProperty\(['"]overflow['"]\)/.test(
      letterpressPageSource
    ),
  'Letterpress page must release the global scroll lock without waiting for images.'
);
assert(
  !/isLoaderVisible|renderLoader|minLoadTime/.test(letterpressPageSource),
  'Letterpress page must render its body without a loader gate.'
);
assert(
  /state\.galleryImageUrls\.length\s*>\s*0/.test(letterpressPageSource),
  'Letterpress page must omit the gallery when no gallery images are available.'
);
assert(
  !/Scroll|eyebrow=/.test(letterpressPageSource),
  'Letterpress page must not render Scroll copy or a default English kicker.'
);

const sectionOrder = [
  'hero',
  'invitation',
  'schedule',
  'contact',
  'gift',
  'gallery',
  'guestbook',
].map((section) => letterpressPageSource.indexOf(`data-letterpress-section="${section}"`));
assert(
  sectionOrder.every((position) => position >= 0),
  'Letterpress page must expose every required information section.'
);
assert(
  sectionOrder.every((position, index) => index === 0 || sectionOrder[index - 1] < position),
  'Letterpress information must follow hero, invitation, schedule, contact, gift, gallery, guestbook order.'
);

console.log('classic-r theme wiring passed.');
