import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { EVENT_TYPE_KEYS } from '../src/lib/eventTypes.ts';
import {
  createInitialWizardConfig,
  getWizardSteps,
} from '../src/app/page-wizard/pageWizardData.ts';
import {
  buildWizardSections,
  findWizardSectionByStepKey,
  flattenWizardSectionStepKeys,
  getAdjacentWizardSection,
  getWizardSectionValidation,
} from '../src/app/page-wizard/pageWizardSections.ts';
import { revealWizardStep } from '../src/app/page-wizard/pageWizardFocus.ts';
import {
  hasMeaningfulInputForWizardStep,
  getWizardSaveStatusLabel,
  getWizardSectionStatus,
  markWizardStepInteraction,
  resolveWizardSelectionInteraction,
  resolveWizardSaveStatus,
  resolveWizardPublishedState,
  buildWizardReviewFacts,
} from '../src/app/page-wizard/pageWizardWorkspaceState.ts';
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

assert.equal(getWizardSaveStatusLabel('idle'), '편집 준비됨');
assert.equal(getWizardSaveStatusLabel('dirty'), '변경사항 있음');
assert.equal(
  getWizardSectionStatus({
    isActive: false,
    valid: true,
    hasMeaningfulInput: false,
  }),
  '미입력'
);
assert.equal(
  getWizardSectionStatus({
    isActive: false,
    valid: false,
    hasMeaningfulInput: true,
    invalidStepCount: 2,
  }),
  '확인 필요 2개'
);

const emptySlugStepState = {
  slugInput: '',
  persistedSlug: null,
  groomKoreanName: '',
  brideKoreanName: '',
  groomEnglishName: '',
  brideEnglishName: '',
};

assert.equal(
  hasMeaningfulInputForWizardStep('eventType', {
    formState: null,
    slugStepState: emptySlugStepState,
  }),
  false,
  '기본 이벤트 타입만으로는 작업 영역을 완료로 표시하면 안 됩니다.'
);
assert.equal(
  hasMeaningfulInputForWizardStep('eventType', {
    formState: null,
    slugStepState: emptySlugStepState,
    hasEventTypeSelection: true,
  }),
  true,
  '사용자가 이벤트 타입을 직접 고르면 작업 영역을 완료로 표시해야 합니다.'
);
const interactedStepKeys = markWizardStepInteraction(new Set(), 'eventType');
assert.equal(
  hasMeaningfulInputForWizardStep('eventType', {
    formState: null,
    slugStepState: emptySlugStepState,
    hasEventTypeSelection: interactedStepKeys.has('eventType'),
  }),
  true,
  '기본 이벤트 타입 카드를 다시 선택해도 상호작용을 기록해야 합니다.'
);
const themeInteractedStepKeys = markWizardStepInteraction(new Set(), 'theme');
assert.equal(
  hasMeaningfulInputForWizardStep('theme', {
    formState: null,
    slugStepState: emptySlugStepState,
    hasThemeSelection: themeInteractedStepKeys.has('theme'),
  }),
  true,
  '저장 전 테마를 선택하면 테마 작업 영역을 완료로 표시해야 합니다.'
);

const sameThemeSelection = resolveWizardSelectionInteraction('classic', 'classic');
assert.deepEqual(
  sameThemeSelection,
  { hasExplicitSelection: true, hasUnsavedChanges: false },
  '현재 테마를 다시 선택하면 선택 확인만 기록하고 미저장 상태로 만들면 안 됩니다.'
);

const changedThemeSelection = resolveWizardSelectionInteraction('classic', 'gyeol');
assert.deepEqual(
  changedThemeSelection,
  { hasExplicitSelection: true, hasUnsavedChanges: true },
  '다른 테마를 선택하면 선택 확인과 미저장 상태를 모두 기록해야 합니다.'
);

const seededBirthdayConfig = createInitialWizardConfig('birthday');
assert.ok(
  seededBirthdayConfig.pageData?.greetingMessage?.trim(),
  '생일 신규 위저드 fixture에는 초기 seed 인사말이 있어야 합니다.'
);
assert.equal(
  hasMeaningfulInputForWizardStep('greeting', {
    formState: seededBirthdayConfig,
    slugStepState: emptySlugStepState,
  }),
  false,
  '초기 seed 인사말만 있는 신규 위저드는 인사말 작업을 완료로 표시하면 안 됩니다.'
);
assert.equal(
  hasMeaningfulInputForWizardStep('greeting', {
    formState: seededBirthdayConfig,
    slugStepState: emptySlugStepState,
    hasStepInteraction: true,
  }),
  true,
  '초기 인사말을 사용자가 명시적으로 확인하면 완료로 표시할 수 있어야 합니다.'
);
assert.equal(
  hasMeaningfulInputForWizardStep('final', {
    formState: null,
    slugStepState: emptySlugStepState,
  }),
  false,
  '검토 단계는 별도 입력이 없으므로 초기 상태에서 미입력이어야 합니다.'
);

const themeStepSource = readFileSync(
  new URL('../src/app/page-wizard/steps/ThemeStep.tsx', import.meta.url),
  'utf8'
);

assert.match(themeStepSource, /aria-pressed=\{isActive\}/);
assert.match(themeStepSource, /getThemeLabel\(theme\)/);
assert.match(themeStepSource, /getThemeDescription\(theme\)/);
assert.match(themeStepSource, /data-theme-preview=\{theme\}/);

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

const navigationSource = readFileSync(
  new URL('../src/app/page-wizard/hooks/useWizardNavigation.ts', import.meta.url), 'utf8'
);
const reviewConfig = createInitialWizardConfig('wedding');
reviewConfig.displayName = '이전 표지 제목';
reviewConfig.couple.groom.name = '수정한 신랑';
reviewConfig.couple.bride.name = '수정한 신부';
reviewConfig.venue = '수정한 장소';
reviewConfig.pageData = { ...reviewConfig.pageData, venueName: '이전 장소', ceremonyAddress: '수정한 주소' };
reviewConfig.weddingDateTime = { year: 2027, month: 3, day: 12, hour: 16, minute: 30 };
reviewConfig.metadata.images.wedding = 'https://example.com/photo.jpg';
const facts = buildWizardReviewFacts(reviewConfig, false);
assert.equal(facts.find((item) => item.label === '신랑 · 신부')?.value, '수정한 신랑 · 수정한 신부');
assert.equal(facts.find((item) => item.label === '표지 제목')?.value, '이전 표지 제목');
assert.equal(facts.find((item) => item.label === '장소')?.value, '수정한 장소');
assert.equal(facts.find((item) => item.label === '주소')?.value, '수정한 주소');
assert.match(facts.find((item) => item.label === '일정')?.value ?? '', /2027/);
assert.match(facts.find((item) => item.label === '대표 이미지')?.value ?? '', /확인 필요/);
for (const eventType of ['birthday', 'first-birthday', 'opening', 'general-event'] as const) {
  reviewConfig.eventType = eventType;
  const identity = buildWizardReviewFacts(reviewConfig, true)[0];
  assert.equal(identity.value, eventType === 'birthday' ? '수정한 신랑' : '이전 표지 제목');
}
assert.doesNotMatch(navigationSource, /publish:\s*false/,
  '다음 작업 이동은 기존 공개 상태를 비공개로 바꾸면 안 됩니다.');
assert.match(navigationSource, /publish:\s*published/,
  '최종 확인은 사용자가 명시한 공개 선택을 저장해야 합니다.');
assert.equal(resolveWizardPublishedState(true), true, '공개된 페이지의 일반 저장은 공개를 유지합니다.');
assert.equal(resolveWizardPublishedState(false), false, '새 초안의 일반 저장은 비공개를 유지합니다.');
assert.equal(resolveWizardPublishedState(true, false), false, '최종 비공개 선택은 적용합니다.');
assert.equal(resolveWizardPublishedState(false, true), true, '최종 공개 선택은 적용합니다.');
const persistenceSource = readFileSync(
  new URL('../src/app/page-wizard/hooks/useWizardPersistence.ts', import.meta.url), 'utf8'
);
assert.match(persistenceSource, /resolveWizardPublishedState\(published, options\?\.publish\)/);
assert.match(persistenceSource, /변경사항을 저장했습니다/);
assert.doesNotMatch(persistenceSource, /페이지를 공개했습니다/,
  '일반 내용 저장에 공개 변경 성공 메시지를 표시하면 안 됩니다.');

console.log('page wizard workspace mapping checks passed');
