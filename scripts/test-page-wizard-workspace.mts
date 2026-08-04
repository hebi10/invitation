import assert from 'node:assert/strict';

import { EVENT_TYPE_KEYS } from '../src/lib/eventTypes.ts';
import { getWizardSteps } from '../src/app/page-wizard/pageWizardData.ts';
import {
  buildWizardSections,
  findWizardSectionByStepKey,
  flattenWizardSectionStepKeys,
  getAdjacentWizardSection,
  getWizardSectionValidation,
} from '../src/app/page-wizard/pageWizardSections.ts';
import { revealWizardStep } from '../src/app/page-wizard/pageWizardFocus.ts';
import { resolveWizardSaveStatus } from '../src/app/page-wizard/pageWizardWorkspaceState.ts';
import { getSelectedTemplateLabel } from '../src/app/page-wizard/pageWizardTemplateSelection.ts';

for (const eventType of EVENT_TYPE_KEYS) {
  for (const includeSetupSteps of [true, false]) {
    for (const includeEventTypeStep of [true, false]) {
      const steps = getWizardSteps({
        eventType,
        includeSetupSteps,
        includeEventTypeStep,
      });
      const sections = buildWizardSections(steps);
      const flattened = flattenWizardSectionStepKeys(sections);

      assert.deepEqual(
        flattened,
        steps.map((step) => step.key),
        `${eventType} 단계 순서와 작업 영역 순서가 같아야 합니다.`
      );
      assert.equal(
        new Set(flattened).size,
        flattened.length,
        `${eventType} 단계가 작업 영역에 중복되면 안 됩니다.`
      );
      assert.ok(
        sections.length > 0 && sections.length <= 6,
        `${eventType} 작업 영역은 1개 이상 6개 이하여야 합니다.`
      );
      assert.equal(
        sections.every((section) => section.steps.length > 0),
        true,
        `${eventType} 빈 작업 영역은 표시하면 안 됩니다.`
      );
    }
  }
}

const weddingSteps = getWizardSteps({
  eventType: 'wedding',
  includeSetupSteps: true,
  includeEventTypeStep: false,
});
const weddingSections = buildWizardSections(weddingSteps);
const setupSection = weddingSections.find((section) => section.id === 'setup');

assert.ok(setupSection, 'wedding create wizard should provide the setup section');
assert.equal(findWizardSectionByStepKey(weddingSections, 'slug')?.id, 'setup');
assert.equal(getAdjacentWizardSection(weddingSections, 'setup', -1), null);
assert.equal(getAdjacentWizardSection(weddingSections, 'setup', 1)?.id, 'basic');

const setupValidation = getWizardSectionValidation(setupSection, (stepKey) =>
  stepKey === 'slug'
    ? { valid: false, messages: ['페이지 주소를 확인해 주세요.'] }
    : { valid: true, messages: [] }
);

assert.deepEqual(setupValidation.invalidStepKeys, ['slug']);
assert.deepEqual(setupValidation.messages, ['페이지 주소를 확인해 주세요.']);
assert.equal(setupValidation.valid, false);

assert.equal(
  resolveWizardSaveStatus({
    isSaving: false,
    hasUnsavedChanges: true,
    lastSavedAt: new Date('2026-08-03T00:00:00.000Z'),
    notice: null,
  }),
  'dirty',
  'saved pages with new edits must show a dirty state'
);
assert.equal(
  resolveWizardSaveStatus({
    isSaving: true,
    hasUnsavedChanges: true,
    lastSavedAt: null,
    notice: null,
  }),
  'saving',
  'saving must take priority over dirty state'
);
assert.equal(
  resolveWizardSaveStatus({
    isSaving: false,
    hasUnsavedChanges: true,
    lastSavedAt: null,
    notice: { tone: 'error', message: '저장 실패', source: 'save' },
  }),
  'error',
  'save failures must take priority over dirty state'
);

const focusActions: Array<[string, unknown]> = [];
const didRevealStep = revealWizardStep('slug', () => ({
  scrollIntoView: (options) => focusActions.push(['scroll', options]),
  focus: (options) => focusActions.push(['focus', options]),
}));

assert.equal(didRevealStep, true);
assert.deepEqual(focusActions, [
  ['scroll', { behavior: 'smooth', block: 'start' }],
  ['focus', { preventScroll: true }],
]);

const greetingTemplates = [
  { label: '격식형', value: '격식형 문구' },
  { label: '따뜻한형', value: '따뜻한 문구' },
];

assert.equal(
  getSelectedTemplateLabel(greetingTemplates, '따뜻한 문구'),
  '따뜻한형',
  '현재 문구와 정확히 일치하는 템플릿을 선택 상태로 표시해야 합니다.'
);
assert.equal(
  getSelectedTemplateLabel(greetingTemplates, '따뜻한 문구를 직접 수정'),
  null,
  '사용자가 템플릿 문구를 직접 수정하면 선택 상태를 해제해야 합니다.'
);

console.log('page wizard workspace mapping checks passed');
