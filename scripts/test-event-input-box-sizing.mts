import assert from 'node:assert/strict';
import fs from 'node:fs';

const cssFiles = [
  'src/app/_components/firstBirthday/FirstBirthdayInvitationPage.module.css',
  'src/app/_components/birthday/BirthdayInvitationPage.module.css',
  'src/app/_components/birthday/BirthdayGuestbook.module.css',
  'src/app/_components/generalEvent/GeneralEventInvitationPage.module.css',
  'src/app/_components/opening/OpeningInvitationPage.module.css',
];

for (const filePath of cssFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes('box-sizing: border-box;'),
    true,
    `${filePath} should keep padded form controls inside their parent width`
  );
}

const firstBirthdayCss = fs.readFileSync(cssFiles[0], 'utf8');
assert.equal(
  firstBirthdayCss.includes('white-space: nowrap;'),
  true,
  'first-birthday guestbook count should not wrap into a vertical stack'
);
assert.equal(
  firstBirthdayCss.includes('font-size: clamp(2.15rem, 8vw, 3.25rem);'),
  true,
  'first-birthday hero title should stay balanced on mobile widths'
);
assert.equal(
  firstBirthdayCss.includes('word-break: keep-all;'),
  true,
  'event titles should avoid awkward Korean word splitting'
);

for (const filePath of [
  'src/app/_components/birthday/BirthdayInvitationPage.module.css',
  'src/app/_components/generalEvent/GeneralEventInvitationPage.module.css',
  'src/app/_components/opening/OpeningInvitationPage.module.css',
]) {
  const source = fs.readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes('font-size: clamp('),
    true,
    `${filePath} should use bounded responsive title sizing`
  );
  assert.equal(
    source.includes('letter-spacing: 0;'),
    true,
    `${filePath} should avoid compressed display text`
  );
}

console.log('event input box sizing checks passed');
