import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

function parseHexColor(value: string) {
  const hex = value.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function relativeLuminance(color: string) {
  const channels = parseHexColor(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

const publicInvitationIndexPaths = [
  'src/app/_components/public-invitations/wedding/index.ts',
  'src/app/_components/public-invitations/first-birthday/index.ts',
  'src/app/_components/public-invitations/birthday/index.ts',
  'src/app/_components/public-invitations/opening/index.ts',
  'src/app/_components/public-invitations/general-event/index.ts',
] as const;

for (const indexPath of publicInvitationIndexPaths) {
  assert.equal(existsSync(indexPath), true, `${indexPath} must exist`);
}

const weddingRegistry = read('src/app/_components/themeRenderers/registry.ts');
const weddingIndex = read(
  'src/app/_components/public-invitations/wedding/index.ts'
);
assert.match(
  weddingRegistry,
  /from ['"]\.\.\/public-invitations\/wedding['"];/,
  'wedding renderer registry must import pages from public-invitations/wedding'
);
assert.doesNotMatch(
  weddingRegistry,
  /from ['"]\.\/(?:classic-r|emotional|romantic|simple)['"];/,
  'wedding renderer registry must not import legacy renderer modules directly'
);

const weddingNarrativeThemes = [
  {
    key: 'emotional',
    exportName: 'PortraitLetterPage',
    folder: 'portrait-letter',
    markers: ['portrait', 'letter', 'schedule', 'location', 'contact', 'gift', 'gallery', 'guestbook'],
  },
  {
    key: 'romantic',
    exportName: 'GardenNotePage',
    folder: 'garden-note',
    markers: ['letter', 'ceremony', 'family', 'gift', 'gallery', 'guestbook'],
  },
  {
    key: 'simple',
    exportName: 'QuietCeremonyPage',
    folder: 'quiet-ceremony',
    markers: ['opening', 'schedule', 'location', 'gift', 'gallery', 'guestbook'],
  },
] as const;

for (const theme of weddingNarrativeThemes) {
  const pagePath = `src/app/_components/public-invitations/wedding/${theme.folder}/Page.tsx`;
  const cssPath = `src/app/_components/public-invitations/wedding/${theme.folder}/styles.module.css`;

  assert.equal(existsSync(pagePath), true, `${theme.exportName} should have a dedicated page`);
  assert.equal(existsSync(cssPath), true, `${theme.exportName} should own dedicated styles`);
  assert.match(
    weddingIndex,
    new RegExp(`default as ${theme.exportName}.*${theme.folder}/Page`),
    `${theme.exportName} should be exported from its dedicated page`
  );
  assert.match(
    weddingRegistry,
    new RegExp(`key: ['"]${theme.key}['"][\\s\\S]*?component: ${theme.exportName}`),
    `${theme.key} should remain bound to ${theme.exportName}`
  );

  const page = read(pagePath);
  assert.match(page, /getThemePageData/);
  assert.match(page, /getCeremonySchedule/);
  assert.match(page, /getCeremonyAddress/);
  assert.match(page, /shouldShowGiftInfo/);
  assert.match(page, /from ['"]\.\.\/\.\.\/shared\/InvitationPoster['"]/);
  assert.match(page, /<GalleryGridShared/);
  assert.match(page, /<GuestbookThemed/);
  assert.match(page, /<GiftInfoThemed/);
  assert.doesNotMatch(page, /WeddingLoader|IntroScreen|setTimeout|setInterval|Scroll/);

  const markerPositions = theme.markers.map((marker) =>
    page.indexOf(`data-${theme.folder}-section="${marker}"`)
  );
  assert.equal(
    markerPositions.every((position) => position >= 0),
    true,
    `${theme.exportName} should define its narrative section markers`
  );
  assert.deepEqual(
    markerPositions,
    [...markerPositions].sort((first, second) => first - second),
    `${theme.exportName} should preserve its dedicated information rhythm`
  );
}

const portraitLetterPage = read(
  'src/app/_components/public-invitations/wedding/portrait-letter/Page.tsx'
);
const gardenNotePage = read(
  'src/app/_components/public-invitations/wedding/garden-note/Page.tsx'
);
const quietCeremonyPage = read(
  'src/app/_components/public-invitations/wedding/quiet-ceremony/Page.tsx'
);

assert.match(portraitLetterPage, /className=\{styles\.portraitHero\}/);
assert.match(gardenNotePage, /data-garden-note-decoration="botanical-line"/);
assert.equal(
  gardenNotePage.match(/data-garden-note-decoration=/g)?.length,
  1,
  'Garden Note should use one botanical decoration only'
);
assert.match(
  gardenNotePage,
  /\[page\.couple\.groom\.father,\s*page\.couple\.groom\.mother,\s*page\.couple\.bride\.father,\s*page\.couple\.bride\.mother\]/s,
  'Garden Note should prioritize family contacts'
);
assert.match(quietCeremonyPage, /heroImageUrl\s*\?/);
assert.match(quietCeremonyPage, /className=\{styles\.informationHero\}/);

const birthdayRegistry = read(
  'src/app/_components/birthday/themeRenderers/registry.ts'
);
assert.match(
  birthdayRegistry,
  /from ['"]\.\.\/\.\.\/public-invitations\/birthday['"];/,
  'birthday renderer registry must import pages from public-invitations/birthday'
);
assert.doesNotMatch(
  birthdayRegistry,
  /from ['"]\.\/(?:floral|minimal)['"];/,
  'birthday renderer registry must not import legacy renderer modules directly'
);

const poster = read('src/app/_components/public-invitations/shared/InvitationPoster.tsx');
assert.match(poster, /export function InvitationPoster/);
assert.match(poster, /dateLabel/);
assert.doesNotMatch(poster, /준비 중|이미지 없음/);

const actionCss = read('src/app/_components/public-invitations/shared/InvitationActionLink.module.css');
assert.match(actionCss, /min-height:\s*44px/);
assert.match(actionCss, /min-width:\s*44px/);
assert.match(actionCss, /:focus-visible/);

const studioOpeningPagePath =
  'src/app/_components/public-invitations/opening/studio-opening/Page.tsx';
const studioOpeningCssPath =
  'src/app/_components/public-invitations/opening/studio-opening/styles.module.css';

assert.equal(
  existsSync(studioOpeningPagePath),
  true,
  'opening-natural should have a dedicated Studio Opening page'
);
assert.equal(
  existsSync(studioOpeningCssPath),
  true,
  'Studio Opening should own dedicated visual-world styles'
);

const studioOpeningPage = read(studioOpeningPagePath);
const studioOpeningCss = read(studioOpeningCssPath);

assert.match(studioOpeningPage, /buildOpeningInvitationViewModel/);
assert.match(studioOpeningPage, /from ['"]\.\.\/\.\.\/shared\/InvitationPoster['"]/);
assert.match(studioOpeningPage, /from ['"]\.\.\/\.\.\/shared\/InvitationActionLink['"]/);
assert.match(studioOpeningPage, /model\.benefitItems\.length\s*>\s*0\s*\?/);
assert.match(studioOpeningPage, /model\.mapUrl\s*\?/);
assert.match(studioOpeningPage, /지도에서 길찾기/);
assert.match(studioOpeningPage, /model\.galleryImageUrls\.length\s*>\s*0\s*\?/);
assert.match(studioOpeningPage, /features\.showGuestbook\s*\?/);
assert.match(
  studioOpeningPage,
  /const tagline = state\.pageConfig\.description\.trim\(\);/,
  'Studio Opening should derive its tagline from source description data'
);
assert.match(
  studioOpeningPage,
  /const greeting = pageData\?\.greetingMessage\?\.trim\(\) \?\? ['"]['"];/,
  'Studio Opening should derive its greeting from source opening data'
);
assert.match(
  studioOpeningPage,
  /tagline\s*\?\s*<p className=\{styles\.tagline\}>\{tagline\}<\/p>\s*:\s*null/,
  'Studio Opening should omit an absent source tagline'
);
assert.match(
  studioOpeningPage,
  /greeting\s*\?\s*<p className=\{styles\.greeting\}>\{greeting\}<\/p>\s*:\s*null/,
  'Studio Opening should omit an absent source greeting'
);
assert.doesNotMatch(
  studioOpeningPage,
  /초대장 열기|오픈 준비 중|setTimeout|setInterval|<IntroScreen/
);
assert.doesNotMatch(studioOpeningPage, /준비 중|이미지 없음|입력해 주세요/);

const studioOpeningOrder = [
  'data-studio-opening-section="identity"',
  'data-studio-opening-section="services"',
  'data-studio-opening-section="benefits"',
  'data-studio-opening-section="visit"',
].map((marker) => studioOpeningPage.indexOf(marker));

assert.equal(
  studioOpeningOrder.every((position) => position >= 0),
  true,
  'Studio Opening should define every required information section'
);
assert.deepEqual(
  studioOpeningOrder,
  [...studioOpeningOrder].sort((first, second) => first - second),
  'Studio Opening should order identity, services, benefits, then visit information'
);
assert.doesNotMatch(studioOpeningCss, /(?:linear|radial|conic)-gradient/);
assert.doesNotMatch(studioOpeningCss, /box-shadow/);
assert.match(studioOpeningCss, /min-height:\s*44px/);
assert.match(studioOpeningCss, /:focus-visible/);

const studioPopupSurface = studioOpeningCss.match(
  /--popup-surface:\s*(#[0-9a-f]{6})/i
)?.[1];
const studioPopupForeground = studioOpeningCss.match(
  /--accent-contrast:\s*(#[0-9a-f]{6})/i
)?.[1];

assert.ok(studioPopupSurface, 'Studio Opening should define its popup surface color');
assert.ok(studioPopupForeground, 'Studio Opening should define its popup foreground color');
assert.ok(
  contrastRatio(studioPopupSurface, studioPopupForeground) >= 4.5,
  'Studio Opening popup helper text should meet AA contrast'
);
assert.match(
  studioOpeningCss,
  /\.popupLoadingText,\s*\.imageCounter\s*\{[\s\S]*?color:\s*var\(--accent-contrast\)/,
  'Studio Opening popup loading and counter text should use the light popup foreground'
);

const firstChapterPagePath =
  'src/app/_components/public-invitations/first-birthday/first-chapter/Page.tsx';
const firstChapterCssPath =
  'src/app/_components/public-invitations/first-birthday/first-chapter/styles.module.css';

assert.equal(
  existsSync(firstChapterPagePath),
  true,
  'first-birthday-pink should have a dedicated First Chapter page'
);
assert.equal(
  existsSync(firstChapterCssPath),
  true,
  'First Chapter should own dedicated visual-world styles'
);

const firstBirthdayIndex = read(
  'src/app/_components/public-invitations/first-birthday/index.ts'
);
const firstBirthdayRegistry = read(
  'src/app/_components/firstBirthday/themeRenderers/registry.ts'
);
const firstChapterPage = read(firstChapterPagePath);
const firstChapterCss = read(firstChapterCssPath);

assert.match(
  firstBirthdayIndex,
  /first-chapter\/Page/,
  'the public first-birthday index should export the dedicated First Chapter page'
);
assert.match(
  firstBirthdayRegistry,
  /'first-birthday-pink':\s*FirstChapterPage/,
  'first-birthday-pink should remain bound to FirstChapterPage'
);
assert.match(firstChapterPage, /from ['"]\.\.\/\.\.\/shared\/InvitationPoster['"]/);
assert.match(firstChapterPage, /const hasContact = Boolean\(model\.contact\.trim\(\)\)/);
assert.match(firstChapterPage, /const hasLocation = Boolean\(/);
assert.match(firstChapterPage, /features\.showGuestbook\s*\?/);
assert.doesNotMatch(firstChapterPage, /<FirstBirthdayIntro|setTimeout|setInterval/);
assert.doesNotMatch(firstChapterPage, /준비 중|이미지 없음|입력해 주세요/);
assert.doesNotMatch(firstChapterCss, /(?:linear|radial|conic)-gradient/);
assert.doesNotMatch(firstChapterCss, /box-shadow/);
assert.match(firstChapterCss, /min-height:\s*44px/);
assert.match(firstChapterCss, /:focus-visible/);

const controlLine = firstChapterCss.match(/--control-line:\s*(#[0-9a-f]{6})/i)?.[1];
const inputSurface = firstChapterCss.match(/--input-surface:\s*(#[0-9a-f]{6})/i)?.[1];

assert.ok(controlLine, 'First Chapter should define a dedicated non-text control boundary');
assert.ok(inputSurface, 'First Chapter should define its input surface color');
assert.ok(
  contrastRatio(controlLine, inputSurface) >= 3,
  'First Chapter input boundary should have at least 3:1 contrast against its surface'
);
assert.match(
  firstChapterCss,
  /\.input,[\s\S]*?\.textarea\s*\{[\s\S]*?border:\s*1px solid var\(--control-line\)/,
  'First Chapter inputs should use the accessible control boundary token'
);

const chapterThemeFiles = [
  {
    name: 'Dawn Chapter',
    page: 'src/app/_components/public-invitations/first-birthday/dawn-chapter/Page.tsx',
    css: 'src/app/_components/public-invitations/first-birthday/dawn-chapter/styles.module.css',
  },
  {
    name: 'Party Notes',
    page: 'src/app/_components/public-invitations/birthday/party-notes/Page.tsx',
    css: 'src/app/_components/public-invitations/birthday/party-notes/styles.module.css',
  },
  {
    name: 'Birthday Story',
    page: 'src/app/_components/public-invitations/birthday/birthday-story/Page.tsx',
    css: 'src/app/_components/public-invitations/birthday/birthday-story/styles.module.css',
  },
] as const;

for (const theme of chapterThemeFiles) {
  assert.equal(existsSync(theme.page), true, `${theme.name} should have a dedicated page`);
  assert.equal(existsSync(theme.css), true, `${theme.name} should own dedicated styles`);

  const page = read(theme.page);
  const css = read(theme.css);
  assert.match(page, /<GalleryGridShared/);
  assert.match(page, /<GuestbookThemed/);
  assert.doesNotMatch(page, /준비 중|이미지 없음|입력해 주세요/);
  assert.doesNotMatch(page, /setTimeout|setInterval|<IntroScreen/);
  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/);
  assert.doesNotMatch(css, /box-shadow/);
  assert.doesNotMatch(css, /border-radius:\s*(?:2[4-9]|[3-9]\d|\d{3,})px/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);

  const paper = css.match(/--paper:\s*(#[0-9a-f]{6})/i)?.[1];
  const muted = css.match(/--muted:\s*(#[0-9a-f]{6})/i)?.[1];
  const popup = css.match(/--popup-surface:\s*(#[0-9a-f]{6})/i)?.[1];
  const popupText = css.match(/--popup-text:\s*(#[0-9a-f]{6})/i)?.[1];
  const controlLine = css.match(/--control-line:\s*(#[0-9a-f]{6})/i)?.[1];
  const inputSurface = css.match(/--input-surface:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(paper, `${theme.name} should define its paper color`);
  assert.ok(muted, `${theme.name} should define its secondary text color`);
  assert.ok(popup, `${theme.name} should define its popup surface color`);
  assert.ok(popupText, `${theme.name} should define its popup text color`);
  assert.ok(controlLine, `${theme.name} should define its input boundary color`);
  assert.ok(inputSurface, `${theme.name} should define its input surface color`);
  assert.ok(
    contrastRatio(paper, muted) >= 4.5,
    `${theme.name} secondary text should meet AA contrast`
  );
  assert.ok(
    contrastRatio(popup, popupText) >= 4.5,
    `${theme.name} popup helper text should meet AA contrast`
  );
  assert.ok(
    contrastRatio(controlLine, inputSurface) >= 3,
    `${theme.name} input boundary should remain distinguishable from its surface`
  );
}

const firstBirthdayIndexForChapterThemes = read(
  'src/app/_components/public-invitations/first-birthday/index.ts'
);
const birthdayIndexForChapterThemes = read(
  'src/app/_components/public-invitations/birthday/index.ts'
);
assert.match(firstBirthdayIndexForChapterThemes, /dawn-chapter\/Page/);
assert.match(birthdayIndexForChapterThemes, /party-notes\/Page/);
assert.match(birthdayIndexForChapterThemes, /birthday-story\/Page/);

const programEditionPagePath =
  'src/app/_components/public-invitations/general-event/program-edition/Page.tsx';
const programEditionCssPath =
  'src/app/_components/public-invitations/general-event/program-edition/styles.module.css';

assert.equal(
  existsSync(programEditionPagePath),
  true,
  'general-event-elegant should have a dedicated Program Edition page'
);
assert.equal(
  existsSync(programEditionCssPath),
  true,
  'Program Edition should own dedicated visual-world styles'
);

const generalEventIndex = read(
  'src/app/_components/public-invitations/general-event/index.ts'
);
const generalEventRoute = read(
  'src/app/_components/generalEvent/GeneralEventInvitationPage.tsx'
);
const programEditionPage = read(programEditionPagePath);
const programEditionCss = read(programEditionCssPath);

assert.match(
  generalEventIndex,
  /program-edition\/Page/,
  'the public general-event index should export the dedicated Program Edition page'
);
assert.match(
  generalEventRoute,
  /if\s*\(visualTheme\s*===\s*['"]general-event-elegant['"]\)\s*\{[\s\S]*?<ProgramEditionPage state=\{state\}\s*\/>/,
  'general-event-elegant should remain bound to ProgramEditionPage'
);
assert.match(programEditionPage, /buildGeneralEventViewModel/);
assert.match(programEditionPage, /from ['"]\.\.\/\.\.\/shared\/InvitationActionLink['"]/);
assert.match(
  programEditionPage,
  /const sourceProgramItems =\s*state\.pageConfig\.pageData\?\.programItems\?\.filter/,
  'Program Edition should derive optional program rows from source data'
);
assert.match(
  programEditionPage,
  /const model = \{[\s\S]*?programItems: sourceProgramItems,[\s\S]*?\};/,
  'Program Edition should not expose synthesized fallback program rows'
);
assert.match(programEditionPage, /model\.programItems\.length\s*>\s*0\s*\?/);
assert.match(programEditionPage, /<ol[^>]*className=\{styles\.programList\}/);
assert.match(programEditionPage, /\{item\.time\}/);
assert.match(programEditionPage, /\{item\.title\}/);
assert.match(programEditionPage, /item\.description\s*\?/);
assert.match(
  programEditionPage,
  /const hasContact = Boolean\(model\.contactEmail \|\| model\.contactPhone\)/,
  'Program Edition should only show participation methods backed by contact data'
);
assert.match(programEditionPage, /emailHref\s*\?/);
assert.match(programEditionPage, /phoneHref\s*\?/);
assert.match(programEditionPage, /href=\{emailHref\}/);
assert.match(programEditionPage, /href=\{phoneHref\}/);
assert.match(programEditionPage, /model\.mapUrl\s*\?/);
assert.match(programEditionPage, /state\.galleryImageUrls\.length\s*>\s*0\s*\?/);
assert.match(programEditionPage, /features\.showGuestbook\s*\?/);
assert.doesNotMatch(programEditionPage, /참석 응답 기능은 준비 중|준비 중|RSVP/);
assert.doesNotMatch(programEditionPage, /General Event|<IntroScreen|setTimeout|setInterval/);

const programEditionOrder = [
  'data-program-edition-section="poster"',
  'data-program-edition-section="program"',
  'data-program-edition-section="participation"',
  'data-program-edition-section="visit"',
].map((marker) => programEditionPage.indexOf(marker));

assert.equal(
  programEditionOrder.every((position) => position >= 0),
  true,
  'Program Edition should define poster, program, participation, and visit sections'
);
assert.deepEqual(
  programEditionOrder,
  [...programEditionOrder].sort((first, second) => first - second),
  'Program Edition should order poster, program, participation, then visit information'
);
assert.doesNotMatch(programEditionCss, /(?:linear|radial|conic)-gradient/);
assert.doesNotMatch(programEditionCss, /box-shadow/);
assert.doesNotMatch(programEditionCss, /border-radius:\s*(?:2[4-9]|[3-9]\d|\d{3,})px/);
assert.match(programEditionCss, /min-height:\s*44px/);
assert.match(programEditionCss, /:focus-visible/);

const programEditionPaper = programEditionCss.match(
  /--paper:\s*(#[0-9a-f]{6})/i
)?.[1];
const programEditionMuted = programEditionCss.match(
  /--muted:\s*(#[0-9a-f]{6})/i
)?.[1];

assert.ok(programEditionPaper, 'Program Edition should define its paper color');
assert.ok(programEditionMuted, 'Program Edition should define its secondary text color');
assert.ok(
  contrastRatio(programEditionPaper, programEditionMuted) >= 4.5,
  'Program Edition secondary text should meet AA contrast'
);

console.log('public invitation visual-world checks passed');
