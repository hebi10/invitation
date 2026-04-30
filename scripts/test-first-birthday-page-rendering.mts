import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  'src/app/_components/firstBirthday/FirstBirthdayInvitationPage.tsx',
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

console.log('first birthday page rendering checks passed');
