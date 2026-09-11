import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync('src/app/page-wizard/wizardPersistenceGateway.ts', 'utf8');
const persistenceHook = readFileSync(
  'src/app/page-wizard/hooks/useWizardPersistence.ts',
  'utf8'
);
const navigationHook = readFileSync(
  'src/app/page-wizard/hooks/useWizardNavigation.ts',
  'utf8'
);
const wizardClient = readFileSync('src/app/page-wizard/PageWizardClient.tsx', 'utf8');
const experienceWizardPage = readFileSync(
  'src/app/experience/page-wizard/page.tsx',
  'utf8'
);

assert.match(gateway, /demoExperienceWizardPersistenceGateway/);
assert.match(persistenceHook, /gateway\.createDraft/);
assert.match(persistenceHook, /gateway\.save/);
assert.match(persistenceHook, /version: created\.version/);
assert.match(persistenceHook, /expectedVersion: draftState\.version \?\? persistedVersion/);
assert.match(
  persistenceHook,
  /const sourceConfig = formState/
);
assert.doesNotMatch(persistenceHook, /gateway\.draftCreationPersists &&/,
  '최초 생성도 입력 중인 디자인과 본문을 저장해야 합니다.');
assert.match(wizardClient, /persistedVersion/);
assert.match(gateway, /VERSION_CONFLICT/);
assert.match(wizardClient, /routes\.wizardResult/);
assert.match(navigationHook, /getEditPath/);
assert.doesNotMatch(navigationHook, /`\/page-wizard\/\$\{/);
assert.doesNotMatch(experienceWizardPage, /getServerInvitationPageBySlug/);

console.log('demo experience wizard checks passed');
