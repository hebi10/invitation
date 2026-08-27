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

console.log('first birthday page rendering checks passed');
