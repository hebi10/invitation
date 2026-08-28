import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  EVENT_TYPE_KEYS,
  getEventTypeMeta,
  listEnabledEventTypes,
} from '../src/lib/eventTypes.ts';
import {
  getInvitationThemePathSuffix,
  isInvitationThemeKey,
} from '../src/lib/invitationThemes.ts';
import type { InvitationPage } from '../src/types/invitationPage.ts';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('@/')) {
      return nextResolve(specifier, context);
    }

    const modulePath = path.resolve('src', specifier.slice(2));
    const resolvedPath = fs.existsSync(`${modulePath}.ts`)
      ? `${modulePath}.ts`
      : fs.existsSync(`${modulePath}.tsx`)
        ? `${modulePath}.tsx`
        : modulePath;

    return {
      shortCircuit: true,
      url: pathToFileURL(resolvedPath).href,
    };
  },
});

const {
  DEFAULT_OPENING_THEME,
  OPENING_THEME_KEYS,
  isOpeningThemeKey,
  normalizeOpeningThemeKey,
  resolveOpeningRouteTheme,
} = await import('../src/lib/openingThemes.ts');
const { getPageCategoryEventTypeFilter, isImplementedPageCategory } = await import(
  '../src/app/admin/_components/adminPageUtils.ts'
);

const openingPageSource = fs.readFileSync(
  'src/app/_components/opening/OpeningInvitationPage.tsx',
  'utf8'
);
const generalEventPageSource = fs.readFileSync(
  'src/app/_components/generalEvent/GeneralEventInvitationPage.tsx',
  'utf8'
);
const studioOpeningPagePath =
  'src/app/_components/public-invitations/opening/studio-opening/Page.tsx';
const publicOpeningIndexSource = fs.readFileSync(
  'src/app/_components/public-invitations/opening/index.ts',
  'utf8'
);

assert.equal(
  fs.existsSync(path.resolve(studioOpeningPagePath)),
  true,
  'opening-natural should have a dedicated Studio Opening renderer'
);
assert.match(
  publicOpeningIndexSource,
  /studio-opening\/Page/,
  'the public opening index should export the dedicated Studio Opening page'
);

assert.match(openingPageSource, /from ['"]\.\.\/public-invitations\/opening['"];/);
assert.doesNotMatch(
  openingPageSource,
  /from ['"]\.\/themeRenderers\/shared['"];/,
  'opening route must not import the legacy shared renderer directly'
);
assert.match(
  openingPageSource,
  /openingTheme\s*===\s*['"]opening-natural['"]\s*\?\s*StudioOpeningPage\s*:\s*OpeningPosterPage/,
  'opening-natural should remain bound to StudioOpeningPage'
);
assert.match(
  generalEventPageSource,
  /from ['"]\.\.\/public-invitations\/general-event['"];/
);
assert.doesNotMatch(
  generalEventPageSource,
  /from ['"]\.\/themeRenderers\/shared['"];/,
  'general-event route must not import the legacy shared renderer directly'
);

assert.equal(EVENT_TYPE_KEYS.includes('opening'), true);
assert.equal(listEnabledEventTypes().includes('opening'), true);

const openingMeta = getEventTypeMeta('opening');
assert.equal(openingMeta.label, '개업 초대장');
assert.equal(openingMeta.adminLabel, '개업');
assert.equal(openingMeta.customerLabel, '내 개업 초대장');
assert.equal(openingMeta.defaultRendererKey, 'opening-default');
assert.equal(openingMeta.defaultEditorKey, 'opening-page-editor');
assert.equal(openingMeta.defaultWizardStepConfigKey, 'opening-page-wizard');
assert.equal(openingMeta.enabled, true);

assert.deepEqual(OPENING_THEME_KEYS, ['opening-natural', 'opening-modern']);
assert.equal(DEFAULT_OPENING_THEME, 'opening-natural');
assert.equal(isOpeningThemeKey('opening-natural'), true);
assert.equal(isOpeningThemeKey('opening-modern'), true);
assert.equal(isOpeningThemeKey('opening-luxury'), false);
assert.equal(isInvitationThemeKey('general-event-elegant'), true);
assert.equal(isInvitationThemeKey('general-event-vivid'), true);
assert.equal(getInvitationThemePathSuffix('general-event-elegant'), '/general-event-elegant');
assert.equal(getInvitationThemePathSuffix('general-event-vivid'), '/general-event-vivid');
assert.equal(isInvitationThemeKey('opening-natural'), true);
assert.equal(isInvitationThemeKey('opening-modern'), true);
assert.equal(getInvitationThemePathSuffix('opening-natural'), '/opening-natural');
assert.equal(getInvitationThemePathSuffix('opening-modern'), '/opening-modern');
assert.equal(normalizeOpeningThemeKey('opening-modern'), 'opening-modern');
assert.equal(normalizeOpeningThemeKey('emotional'), DEFAULT_OPENING_THEME);
assert.equal(resolveOpeningRouteTheme(null, 'opening-modern'), null);
assert.equal(resolveOpeningRouteTheme({ slug: 'sample' }, 'opening-modern'), 'opening-modern');
assert.equal(
  resolveOpeningRouteTheme(
    {
      slug: 'sample',
      variants: {
        emotional: {
          available: true,
          path: '/sample/emotional',
          displayName: 'sample emotional',
        },
      },
    } as InvitationPage,
    'opening-modern'
  ),
  'opening-modern'
);

assert.equal(isImplementedPageCategory('opening'), true);
assert.equal(getPageCategoryEventTypeFilter('opening'), 'opening');

console.log('opening event rendering checks passed');
