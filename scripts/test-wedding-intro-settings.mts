import assert from 'node:assert/strict';
import { getRequiredWeddingPageBySlug } from '../src/config/weddingPages.ts';
import { mergeInvitationPageSeed } from '../src/lib/invitationPagePersistence.ts';
import { normalizeFormConfig, prepareConfigForSave } from '../src/app/page-wizard/pageWizardEditorUtils.ts';
import { getWizardSteps } from '../src/app/page-wizard/pageWizardData.ts';
import { buildWizardReviewFacts } from '../src/app/page-wizard/pageWizardWorkspaceState.ts';

const original = structuredClone(getRequiredWeddingPageBySlug('kim-taehyun-choi-yuna'));
delete original.introStyle;
assert.equal(normalizeFormConfig(original).introStyle, 'none', 'Existing invitations remain without an intro');
assert.equal(mergeInvitationPageSeed(original, {})?.introStyle, 'none');

for (const introStyle of ['none', 'light', 'cinema', 'envelope'] as const) {
  const selected = normalizeFormConfig({ ...original, introStyle });
  const prepared = prepareConfigForSave(selected, original.slug);
  const stored = mergeInvitationPageSeed(original, prepared as unknown as Record<string, unknown>)!;
  assert.equal(stored.introStyle, introStyle, 'Editor save and server normalization preserve selected intro');
  assert.equal(normalizeFormConfig(stored).introStyle, introStyle, 'Reload preserves selected intro');
  assert.equal(mergeInvitationPageSeed(stored, { description: '변경된 설명' })?.introStyle, introStyle, 'Partial changes preserve the intro');
  assert.ok(buildWizardReviewFacts(stored, true).find(fact => fact.label === '첫 화면 연출'));
}
assert.equal(mergeInvitationPageSeed({ ...original, introStyle: 'cinema' }, { introStyle: 'none' })?.introStyle, 'none', 'Disabling an intro persists');
assert.equal(mergeInvitationPageSeed(original, { introStyle: 'unsupported' })?.introStyle, 'none', 'Unknown styles safely disable the intro');
const weddingSteps = getWizardSteps({ eventType: 'wedding', includeSetupSteps: false });
const birthdaySteps = getWizardSteps({ eventType: 'birthday', includeSetupSteps: false });
assert.equal(weddingSteps.find(step => step.key === 'music')?.title, '첫 화면 연출과 음악');
assert.equal(birthdaySteps.find(step => step.key === 'music')?.title, '배경음악', 'Other event editors retain their existing music settings');
console.log('Wedding intro settings persistence and existing invitation compatibility passed');
