import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(relativePath, 'utf8');

const openingPageSource = read('src/app/_components/opening/OpeningInvitationPage.tsx');
const generalEventPageSource = read(
  'src/app/_components/generalEvent/GeneralEventInvitationPage.tsx'
);
const openingRenderingTestSource = read('scripts/test-opening-event-rendering.mts');
const eventTypesSource = read('src/lib/eventTypes.ts');
const invitationThemesSource = read('src/lib/invitationThemes.ts');
const openingThemesSource = read('src/lib/openingThemes.ts');
const adminPageUtilsSource = read('src/app/admin/_components/adminPageUtils.ts');
const studioOpeningPagePath =
  'src/app/_components/public-invitations/opening/studio-opening/Page.tsx';
const programEditionPagePath =
  'src/app/_components/public-invitations/general-event/program-edition/Page.tsx';
const publicOpeningIndexSource = read(
  'src/app/_components/public-invitations/opening/index.ts'
);
const publicGeneralEventIndexSource = read(
  'src/app/_components/public-invitations/general-event/index.ts'
);

assert.equal(
  fs.existsSync(path.resolve(studioOpeningPagePath)),
  true,
  'opening-natural should have a dedicated Studio Opening renderer'
);
const unsupportedNodeApiNames = [
  ['register', 'Hooks'].join(''),
  ['node', ':module'].join(''),
];

for (const unsupportedNodeApiName of unsupportedNodeApiNames) {
  assert.equal(
    openingRenderingTestSource.includes(unsupportedNodeApiName),
    false,
    `opening rendering checks must not use Node 20-incompatible API: ${unsupportedNodeApiName}`
  );
}
assert.match(
  publicOpeningIndexSource,
  /studio-opening\/Page/,
  'the public opening index should export the dedicated Studio Opening page'
);
assert.equal(
  fs.existsSync(path.resolve(programEditionPagePath)),
  true,
  'general-event-elegant should have a dedicated Program Edition renderer'
);
assert.match(
  publicGeneralEventIndexSource,
  /program-edition\/Page/,
  'the public general-event index should export the dedicated Program Edition page'
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
assert.match(
  generalEventPageSource,
  /if\s*\(visualTheme\s*===\s*['"]general-event-elegant['"]\)\s*\{[\s\S]*?<ProgramEditionPage state=\{state\}\s*\/>/,
  'general-event-elegant should remain bound to ProgramEditionPage'
);

assert.match(
  eventTypesSource,
  /EVENT_TYPE_KEYS\s*=\s*\[[\s\S]*?['"]opening['"][\s\S]*?\]\s*as const/
);
assert.match(
  eventTypesSource,
  /opening:\s*\{[\s\S]*?label:\s*['"]개업 초대장['"][\s\S]*?adminLabel:\s*['"]개업['"][\s\S]*?customerLabel:\s*['"]내 개업 초대장['"][\s\S]*?enabled:\s*true[\s\S]*?defaultRendererKey:\s*['"]opening-default['"][\s\S]*?defaultEditorKey:\s*['"]opening-page-editor['"][\s\S]*?defaultWizardStepConfigKey:\s*['"]opening-page-wizard['"]/,
  'opening event metadata contract should remain enabled and stable'
);

assert.match(
  openingThemesSource,
  /OPENING_THEME_KEYS\s*=\s*\[['"]opening-natural['"],\s*['"]opening-modern['"]\]\s*as const/
);
assert.match(
  openingThemesSource,
  /DEFAULT_OPENING_THEME:\s*OpeningThemeKey\s*=\s*['"]opening-natural['"]/
);
assert.match(openingThemesSource, /export function isOpeningThemeKey/);
assert.match(
  openingThemesSource,
  /return isOpeningThemeKey\(value\) \? value : fallback;/,
  'opening theme normalization should preserve valid keys and fall back otherwise'
);
assert.match(
  openingThemesSource,
  /if \(!previewPage\) \{\s*return null;\s*\}/,
  'opening route resolution should preserve the missing-page boundary'
);

for (const [theme, pathSuffix] of [
  ['general-event-elegant', '/general-event-elegant'],
  ['general-event-vivid', '/general-event-vivid'],
  ['opening-natural', '/opening-natural'],
  ['opening-modern', '/opening-modern'],
]) {
  assert.match(
    invitationThemesSource,
    new RegExp(
      `key:\\s*['"]${theme}['"][\\s\\S]*?pathSuffix:\\s*['"]${pathSuffix}['"]`
    ),
    `${theme} should preserve its public path suffix`
  );
}

assert.match(
  adminPageUtilsSource,
  /pageCategory === ['"]opening['"]/,
  'opening should remain an implemented admin category'
);
assert.match(
  adminPageUtilsSource,
  /case ['"]opening['"]:\s*return ['"]opening['"];/,
  'opening admin category should keep its event-type filter'
);

console.log('opening event rendering checks passed');
