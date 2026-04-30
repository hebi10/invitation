import assert from 'node:assert/strict';

import {
  DEFAULT_BIRTHDAY_THEME,
  BIRTHDAY_THEME_KEYS,
  isBirthdayThemeKey,
  resolveBirthdayRouteTheme,
} from '../src/app/_components/birthday/birthdayThemes.ts';
import { getPageWizardPresentation } from '../src/app/page-wizard/pageWizardPresentation.ts';
import {
  getPageCategoryEventTypeFilter,
  isImplementedPageCategory,
} from '../src/app/admin/_components/adminPageUtils.ts';
import type { InvitationPage } from '../src/types/invitationPage.ts';

assert.equal(DEFAULT_BIRTHDAY_THEME, 'birthday-minimal');
assert.deepEqual(BIRTHDAY_THEME_KEYS, ['birthday-minimal', 'birthday-floral']);
assert.equal(isBirthdayThemeKey('birthday-minimal'), true);
assert.equal(isBirthdayThemeKey('birthday-floral'), true);
assert.equal(isBirthdayThemeKey('birthday-luxury'), false);
assert.equal(resolveBirthdayRouteTheme(null, 'birthday-floral'), 'birthday-floral');
assert.equal(resolveBirthdayRouteTheme(null, 'emotional'), DEFAULT_BIRTHDAY_THEME);
assert.equal(
  resolveBirthdayRouteTheme(
    { eventType: 'birthday', pageData: { birthdayTheme: 'birthday-floral' } } as InvitationPage,
    null,
    null
  ),
  'birthday-floral'
);
assert.equal(
  resolveBirthdayRouteTheme(
    { eventType: 'birthday', pageData: { birthdayTheme: 'birthday-floral' } } as InvitationPage,
    'emotional',
    'romantic'
  ),
  'birthday-floral'
);

const birthdayWizardPresentation = getPageWizardPresentation('birthday');
assert.equal(birthdayWizardPresentation.pageClassName, 'birthday');
assert.equal(
  birthdayWizardPresentation.loadingTitle,
  '생일 초대장 편집 화면을 준비하고 있습니다.'
);
assert.equal(
  birthdayWizardPresentation.createLoginTitle,
  '생일 초대장 만들기는 관리자만 이용 가능합니다'
);

assert.equal(isImplementedPageCategory('birthday'), true);
assert.equal(getPageCategoryEventTypeFilter('invitation'), 'wedding');
assert.equal(getPageCategoryEventTypeFilter('birthday'), 'birthday');
assert.equal(getPageCategoryEventTypeFilter('first-birthday'), 'first-birthday');

console.log('birthday event rendering checks passed');
