import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  'src/app/_components/firstBirthday/FirstBirthdayInvitationPage.tsx',
  'utf8'
);
const rendererSource = fs.readFileSync(
  'src/app/_components/firstBirthday/themeRenderers/shared.tsx',
  'utf8'
);
const registrySource = fs.readFileSync(
  'src/app/_components/firstBirthday/themeRenderers/registry.ts',
  'utf8'
);
const cssSource = fs.readFileSync(
  'src/app/_components/firstBirthday/FirstBirthdayInvitationPage.module.css',
  'utf8'
);
const firstChapterPagePath =
  'src/app/_components/public-invitations/first-birthday/first-chapter/Page.tsx';
const firstChapterCssPath =
  'src/app/_components/public-invitations/first-birthday/first-chapter/styles.module.css';

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
  source.includes('<FirstBirthdayIntro'),
  false,
  'first-birthday routes should not be blocked behind the intro card'
);
assert.equal(
  source.includes('<ThemeRenderer state={readyState} />'),
  true,
  'first-birthday routes should render the theme body directly'
);
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
assert.equal(
  rendererSource.includes('const hasCoverImage = Boolean(model.coverImageUrl.trim());'),
  true,
  'first-birthday renderer should distinguish empty image data before laying out the hero'
);
assert.equal(
  rendererSource.includes('styles.heroNoImage'),
  true,
  'first-birthday renderer should apply a compact hero state when no cover image exists'
);
assert.equal(
  cssSource.includes('.heroNoImage .heroImage'),
  true,
  'first-birthday no-image hero should not reserve the cover image slot'
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

console.log('first birthday page rendering checks passed');
