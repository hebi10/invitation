import assert from 'node:assert/strict';

import {
  DEFAULT_BIRTHDAY_THEME,
  BIRTHDAY_THEME_KEYS,
  isBirthdayThemeKey,
  resolveBirthdayRouteTheme,
} from '../src/app/_components/birthday/birthdayThemes.ts';
import {
  getPageCategoryEventTypeFilter,
  isImplementedPageCategory,
} from '../src/app/admin/_components/adminPageUtils.ts';

assert.equal(DEFAULT_BIRTHDAY_THEME, 'birthday-minimal');
assert.deepEqual(BIRTHDAY_THEME_KEYS, ['birthday-minimal', 'birthday-floral']);
assert.equal(isBirthdayThemeKey('birthday-minimal'), true);
assert.equal(isBirthdayThemeKey('birthday-floral'), true);
assert.equal(isBirthdayThemeKey('birthday-luxury'), false);
assert.equal(resolveBirthdayRouteTheme(null, 'birthday-floral'), 'birthday-floral');
assert.equal(resolveBirthdayRouteTheme(null, 'emotional'), DEFAULT_BIRTHDAY_THEME);

assert.equal(isImplementedPageCategory('birthday'), true);
assert.equal(getPageCategoryEventTypeFilter('invitation'), 'wedding');
assert.equal(getPageCategoryEventTypeFilter('birthday'), 'birthday');
assert.equal(getPageCategoryEventTypeFilter('first-birthday'), 'first-birthday');

console.log('birthday event rendering checks passed');
