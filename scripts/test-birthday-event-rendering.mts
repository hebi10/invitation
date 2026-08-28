import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  DEFAULT_BIRTHDAY_THEME,
  BIRTHDAY_THEME_KEYS,
  isBirthdayThemeKey,
  resolveBirthdayRouteTheme,
} from '../src/lib/birthdayThemes.ts';
import {
  getInvitationThemePathSuffix,
  isInvitationThemeKey,
} from '../src/lib/invitationThemes.ts';
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
assert.equal(isInvitationThemeKey('birthday-minimal'), true);
assert.equal(isInvitationThemeKey('birthday-floral'), true);
assert.equal(getInvitationThemePathSuffix('birthday-minimal'), '/birthday-minimal');
assert.equal(getInvitationThemePathSuffix('birthday-floral'), '/birthday-floral');
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

const birthdayRegistrySource = fs.readFileSync(
  'src/app/_components/birthday/themeRenderers/registry.ts',
  'utf8'
);
const partyNotesPagePath =
  'src/app/_components/public-invitations/birthday/party-notes/Page.tsx';
const partyNotesCssPath =
  'src/app/_components/public-invitations/birthday/party-notes/styles.module.css';
const birthdayStoryPagePath =
  'src/app/_components/public-invitations/birthday/birthday-story/Page.tsx';
const birthdayStoryCssPath =
  'src/app/_components/public-invitations/birthday/birthday-story/styles.module.css';

for (const filePath of [
  partyNotesPagePath,
  partyNotesCssPath,
  birthdayStoryPagePath,
  birthdayStoryCssPath,
]) {
  assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`);
}

const partyNotesSource = fs.readFileSync(partyNotesPagePath, 'utf8');
const birthdayStorySource = fs.readFileSync(birthdayStoryPagePath, 'utf8');
const partyNotesCss = fs.readFileSync(partyNotesCssPath, 'utf8');
const birthdayStoryCss = fs.readFileSync(birthdayStoryCssPath, 'utf8');

assert.match(birthdayRegistrySource, /'birthday-minimal':\s*PartyNotesPage/);
assert.match(birthdayRegistrySource, /'birthday-floral':\s*BirthdayStoryPage/);

assert.match(partyNotesSource, /buildBirthdayInvitationViewModel\(state\)/);
assert.match(partyNotesSource, /const hasVenue = Boolean\(/);
assert.match(partyNotesSource, /const hasContact = Boolean\(model\.contact\.trim\(\)\)/);
assert.match(partyNotesSource, /const hasLocation = Boolean\(/);
assert.match(partyNotesSource, /model\.galleryImageUrls\.length\s*>\s*0\s*\?/);
assert.match(partyNotesSource, /features\.showGuestbook\s*\?/);
assert.doesNotMatch(partyNotesSource, /준비 중|이미지 없음|입력해 주세요/);
assert.doesNotMatch(partyNotesSource, /setTimeout|setInterval|<IntroScreen/);

assert.match(birthdayStorySource, /buildBirthdayInvitationViewModel\(state\)/);
assert.match(birthdayStorySource, /<InvitationPoster/);
assert.match(birthdayStorySource, /model\.galleryImageUrls\.length\s*>\s*0\s*\?/);
assert.match(birthdayStorySource, /const hasContact = Boolean\(model\.contact\.trim\(\)\)/);
assert.match(birthdayStorySource, /const hasLocation = Boolean\(/);
assert.match(birthdayStorySource, /features\.showGuestbook\s*\?/);
assert.doesNotMatch(birthdayStorySource, /준비 중|이미지 없음|입력해 주세요/);
assert.doesNotMatch(birthdayStorySource, /setTimeout|setInterval|<IntroScreen/);

for (const [label, css] of [
  ['Party Notes', partyNotesCss],
  ['Birthday Story', birthdayStoryCss],
] as const) {
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.page \.imageItem,\s*\.page \.popupImage \{[\s\S]*?transition:\s*none !important;/,
    `${label} should override shared gallery image transitions for reduced motion`
  );
}

const partyNotesSections = [
  'data-party-notes-section="memo"',
  'data-party-notes-section="schedule"',
  'data-party-notes-section="contact"',
  'data-party-notes-section="location"',
  'data-party-notes-section="gallery"',
  'data-party-notes-section="guestbook"',
].map((section) => partyNotesSource.indexOf(section));
const birthdayStorySections = [
  'data-birthday-story-section="portrait"',
  'data-birthday-story-section="letter"',
  'data-birthday-story-section="gallery"',
  'data-birthday-story-section="schedule"',
  'data-birthday-story-section="location"',
  'data-birthday-story-section="contact"',
  'data-birthday-story-section="guestbook"',
].map((section) => birthdayStorySource.indexOf(section));

for (const [label, positions] of [
  ['Party Notes', partyNotesSections],
  ['Birthday Story', birthdayStorySections],
] as const) {
  assert.equal(
    positions.every((position) => position >= 0),
    true,
    `${label} should expose every ordered content landmark`
  );
  assert.deepEqual(
    [...positions].sort((left, right) => left - right),
    positions,
    `${label} should preserve its dedicated information rhythm`
  );
}

console.log('birthday event rendering checks passed');
