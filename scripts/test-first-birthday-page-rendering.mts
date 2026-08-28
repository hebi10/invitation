import assert from 'node:assert/strict';
import fs from 'node:fs';

import { resolveGalleryOpacityTransition } from '../src/components/sections/Gallery/galleryMotion.ts';
import { resolveFirstBirthdayHeroTitle } from '../src/app/_components/public-invitations/shared/identityModel.ts';

const registrySource = fs.readFileSync(
  'src/app/_components/firstBirthday/themeRenderers/registry.ts',
  'utf8'
);
const firstChapterPagePath =
  'src/app/_components/public-invitations/first-birthday/first-chapter/Page.tsx';
const firstChapterCssPath =
  'src/app/_components/public-invitations/first-birthday/first-chapter/styles.module.css';
const dawnChapterPagePath =
  'src/app/_components/public-invitations/first-birthday/dawn-chapter/Page.tsx';
const dawnChapterCssPath =
  'src/app/_components/public-invitations/first-birthday/dawn-chapter/styles.module.css';

assert.equal(
  fs.existsSync(firstChapterPagePath),
  true,
  'first-birthday-pink should have a dedicated First Chapter renderer'
);
assert.equal(
  fs.existsSync(firstChapterCssPath),
  true,
  'First Chapter should have dedicated visual-world styles'
);

const firstChapterSource = fs.readFileSync(firstChapterPagePath, 'utf8');
const firstChapterCss = fs.readFileSync(firstChapterCssPath, 'utf8');

assert.equal(
  fs.existsSync(dawnChapterPagePath),
  true,
  'first-birthday-mint should have a dedicated Dawn Chapter renderer'
);
assert.equal(
  fs.existsSync(dawnChapterCssPath),
  true,
  'Dawn Chapter should have dedicated visual-world styles'
);

const dawnChapterSource = fs.readFileSync(dawnChapterPagePath, 'utf8');
const dawnChapterCss = fs.readFileSync(dawnChapterCssPath, 'utf8');

assert.equal(
  registrySource.includes("from '../../public-invitations/first-birthday'"),
  true,
  'first-birthday registry renderers must originate from public-invitations/first-birthday'
);
assert.doesNotMatch(
  registrySource,
  /from ['"]\.\/(?:mint|pink)['"];/,
  'first-birthday registry must not import legacy renderer modules directly'
);
assert.match(
  firstChapterSource,
  /buildFirstBirthdayInvitationViewModel\(state\)/,
  'First Chapter should consume the existing first-birthday view model'
);
assert.match(
  firstChapterSource,
  /<InvitationPoster/,
  'First Chapter should use InvitationPoster when its representative image is empty'
);
assert.match(
  firstChapterSource,
  /model\.galleryImageUrls\.length\s*>\s*0\s*\?/,
  'First Chapter should omit the whole growth-photo section when the gallery is empty'
);
assert.doesNotMatch(
  firstChapterSource,
  /First Birthday/,
  'First Chapter should not use the legacy English kicker'
);
assert.equal(resolveFirstBirthdayHeroTitle(''), '첫 번째 생일');
assert.equal(resolveFirstBirthdayHeroTitle('하루'), '하루');
assert.match(
  firstChapterSource,
  /const heroTitle = resolveFirstBirthdayHeroTitle\(visibleBabyName\);/,
  'First Chapter should resolve its empty-identity h1 through the active identity contract'
);
assert.match(
  firstChapterSource,
  /<h1 id="first-chapter-title" className=\{styles\.heroTitle\}>\s*\{heroTitle\}\s*<\/h1>/,
  'First Chapter should always render the resolved image hero title as h1'
);

const orderedSections = [
  'data-first-chapter-section="identity"',
  'data-first-chapter-section="growth"',
  'data-first-chapter-section="schedule"',
  'data-first-chapter-section="location"',
  'data-first-chapter-section="guestbook"',
];
const sectionPositions = orderedSections.map((section) =>
  firstChapterSource.indexOf(section)
);

assert.equal(
  sectionPositions.every((position) => position >= 0),
  true,
  'First Chapter should expose every ordered content landmark'
);
assert.deepEqual(
  [...sectionPositions].sort((left, right) => left - right),
  sectionPositions,
  'First Chapter DOM order should be identity, growth, schedule, location, guestbook'
);
assert.match(firstChapterCss, /min-height:\s*44px/);
assert.match(firstChapterCss, /:focus-visible/);
assert.match(
  firstChapterSource,
  /FALLBACK_IDENTITY_LABELS/,
  'First Chapter should identify adapter fallback identity labels at the page boundary'
);
assert.doesNotMatch(
  firstChapterSource,
  /\{model\.(?:babyName|dadName|momName)\}/,
  'First Chapter should never render adapter fallback identity fields directly'
);
assert.doesNotMatch(
  firstChapterSource,
  /\$\{model\.(?:babyName|dadName|momName)\}/,
  'First Chapter should never interpolate adapter fallback identity fields directly'
);
assert.match(
  firstChapterSource,
  /<ul className=\{styles\.venueGuide\}>/,
  'partial transport guidance should use a list that remains valid with either field absent'
);
assert.match(firstChapterSource, /<li className=\{styles\.guideRow\}/);
assert.doesNotMatch(firstChapterSource, /guide\.title \? <dt|guide\.content \? <dd/);

assert.match(
  registrySource,
  /'first-birthday-mint':\s*DawnChapterPage/,
  'first-birthday-mint should remain bound to DawnChapterPage'
);
assert.match(dawnChapterSource, /buildFirstBirthdayInvitationViewModel\(state\)/);
assert.match(dawnChapterSource, /<InvitationPoster/);
assert.match(dawnChapterSource, /model\.galleryImageUrls\.length\s*>\s*0\s*\?/);
assert.match(dawnChapterSource, /const hasContact = Boolean\(model\.contact\.trim\(\)\)/);
assert.match(dawnChapterSource, /const hasLocation = Boolean\(/);
assert.match(dawnChapterSource, /features\.showGuestbook\s*\?/);
assert.match(dawnChapterSource, /FALLBACK_IDENTITY_LABELS/);
assert.doesNotMatch(dawnChapterSource, /준비 중|이미지 없음|입력해 주세요/);
assert.doesNotMatch(dawnChapterSource, /First Birthday|setTimeout|setInterval/);
assert.match(
  dawnChapterSource,
  /const heroTitle = visibleBabyName\s*\? `\$\{visibleBabyName\}의 첫 아침`\s*:\s*'우리의 첫 아침';/,
  'Dawn Chapter should resolve one effective hero title without exposing the adapter placeholder'
);
assert.match(
  dawnChapterSource,
  /<h1 id="dawn-chapter-title" className=\{styles\.heroTitle\}>\s*\{heroTitle\}\s*<\/h1>/,
  'Dawn Chapter should always render its effective image hero title as h1'
);
assert.doesNotMatch(
  dawnChapterSource,
  /<p className=\{styles\.heroTitle\}>/,
  'Dawn Chapter should not demote its neutral image hero title to a paragraph'
);
assert.equal(resolveGalleryOpacityTransition(true, 300), 'none');
assert.equal(resolveGalleryOpacityTransition(false, 300), 'opacity 0.3s ease');
assert.doesNotMatch(
  dawnChapterCss,
  /\.page \.imageItem,\s*\.page \.popupImage/,
  'Dawn Chapter should rely on the active shared gallery reduced-motion contract'
);

const dawnChapterSections = [
  'data-dawn-chapter-section="identity"',
  'data-dawn-chapter-section="date-record"',
  'data-dawn-chapter-section="growth"',
  'data-dawn-chapter-section="schedule"',
  'data-dawn-chapter-section="location"',
  'data-dawn-chapter-section="guestbook"',
].map((section) => dawnChapterSource.indexOf(section));

assert.equal(
  dawnChapterSections.every((position) => position >= 0),
  true,
  'Dawn Chapter should expose every ordered content landmark'
);
assert.deepEqual(
  [...dawnChapterSections].sort((left, right) => left - right),
  dawnChapterSections,
  'Dawn Chapter DOM order should preserve its date-led narrative rhythm'
);

console.log('first birthday page rendering checks passed');
