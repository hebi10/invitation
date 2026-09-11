import assert from 'node:assert/strict';
import { resolveExperienceGuideStep } from '../src/app/experience/_components/experienceGuideModel.ts';
import { buildStepValidation } from '../src/app/page-wizard/pageWizardData.ts';
import { createDemoExperienceSeedEvents, DEMO_EXPERIENCE_IMAGE_OPTIONS } from '../src/config/demoExperienceSeeds.ts';
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

const config = createDemoExperienceSeedEvents('2026-09-11')[6].config;
const slugState = { slugInput: config.slug, persistedSlug: config.slug };
assert.equal(buildStepValidation('images', 'simple', config, slugState).valid, false);
assert.equal(buildStepValidation('images', 'simple', config, slugState, DEMO_EXPERIENCE_IMAGE_OPTIONS).valid, true);
const invalid = structuredClone(config);
invalid.metadata.images.wedding = '/images/unapproved.png';
assert.equal(buildStepValidation('images', 'simple', invalid, slugState, DEMO_EXPERIENCE_IMAGE_OPTIONS).valid, false);
assert.equal(resolveExperienceGuideStep('/experience/my-invitations', {}), null);
assert.equal(resolveExperienceGuideStep('/experience/my-invitations', { customerReady: true })?.id, 'customer');
assert.equal(resolveExperienceGuideStep('/experience/page-wizard/demo/result', { wizardStep: 'final' }), null);
assert.equal(resolveExperienceGuideStep('/experience/page-wizard/demo/result', { resultReady: true })?.id, 'result');
assert.equal(resolveExperienceGuideStep('/experience/page-wizard/demo', { wizardStep: 'venue' })?.id, 'schedule');
assert.equal(resolveExperienceGuideStep('/experience/page-wizard/demo', { wizardStep: 'music' })?.id, 'media');
assert.equal(resolveExperienceGuideStep('/experience/preview/demo/simple', {}), null);
assert.equal(resolveExperienceGuideStep('/experience/preview/demo/simple', { previewReady: true })?.id, 'preview');
assert.equal(resolveExperienceGuideStep('/my-invitations', { customerReady: true }), null);
assert.match(experienceWizardPage, /redirect/);
assert.match(experienceWizardPage, /DEMO_EXPERIENCE_DAILY_SLUG/);
