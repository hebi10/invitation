import assert from 'node:assert/strict';

import {
  EVENT_TYPE_KEYS,
  getEventTypeMeta,
  listEnabledEventTypes,
} from '../src/lib/eventTypes.ts';
import {
  DEFAULT_OPENING_THEME,
  OPENING_THEME_KEYS,
  isOpeningThemeKey,
  normalizeOpeningThemeKey,
  resolveOpeningRouteTheme,
} from '../src/app/_components/opening/openingThemes.ts';
import {
  getPageCategoryEventTypeFilter,
  isImplementedPageCategory,
} from '../src/app/admin/_components/adminPageUtils.ts';

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
assert.equal(normalizeOpeningThemeKey('opening-modern'), 'opening-modern');
assert.equal(normalizeOpeningThemeKey('emotional'), DEFAULT_OPENING_THEME);
assert.equal(resolveOpeningRouteTheme(null, 'opening-modern'), null);
assert.equal(resolveOpeningRouteTheme({ slug: 'sample' }, 'opening-modern'), 'opening-modern');

assert.equal(isImplementedPageCategory('opening'), true);
assert.equal(getPageCategoryEventTypeFilter('opening'), 'opening');

console.log('opening event rendering checks passed');
