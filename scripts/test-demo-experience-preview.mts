import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const eventThemeTypes = readFileSync('src/app/_components/eventPageThemes.ts', 'utf8');
const eventPage = readFileSync('src/app/_components/EventInvitationPage.tsx', 'utf8');
const previewClient = readFileSync(
  'src/app/experience/preview/[slug]/[[...theme]]/ExperienceInvitationPreviewClient.tsx',
  'utf8'
);
const previewPage = readFileSync(
  'src/app/experience/preview/[slug]/[[...theme]]/page.tsx',
  'utf8'
);

assert.match(eventThemeTypes, /pageLoader/);
assert.match(eventPage, /externalShareEnabled/);
assert.match(previewClient, /getDemoExperienceEvent/);
assert.match(previewClient, /externalShareEnabled=\{false\}/);
assert.doesNotMatch(previewPage, /getServerInvitationPageBySlug/);

console.log('demo experience preview checks passed');
