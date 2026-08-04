import type {
  StepValidation,
  WizardStepDefinition,
  WizardStepKey,
} from './pageWizardData';

export type WizardSectionId =
  | 'setup'
  | 'basic'
  | 'schedule'
  | 'greeting'
  | 'media'
  | 'review';

export type WizardSection = {
  id: WizardSectionId;
  title: string;
  description: string;
  steps: WizardStepDefinition[];
};

export type WizardSectionValidation = StepValidation & {
  invalidStepKeys: WizardStepKey[];
};

type WizardSectionDefinition = Omit<WizardSection, 'steps'> & {
  stepKeys: WizardStepKey[];
};

const SECTION_DEFINITIONS: WizardSectionDefinition[] = [
  {
    id: 'setup',
    title: '시작 설정',
    description: '페이지 유형과 기본 구성을 정합니다.',
    stepKeys: ['eventType', 'theme', 'slug'],
  },
  {
    id: 'basic',
    title: '기본 정보',
    description: '첫 화면에 필요한 정보를 입력합니다.',
    stepKeys: ['basic'],
  },
  {
    id: 'schedule',
    title: '일정과 장소',
    description: '날짜, 시간과 방문 정보를 입력합니다.',
    stepKeys: ['schedule', 'venue'],
  },
  {
    id: 'greeting',
    title: '인사말과 관계 정보',
    description: '초대 문구와 관계 정보를 입력합니다.',
    stepKeys: ['greeting'],
  },
  {
    id: 'media',
    title: '사진과 부가 기능',
    description: '사진, 음악과 추가 안내를 설정합니다.',
    stepKeys: ['images', 'music', 'extra'],
  },
  {
    id: 'review',
    title: '검토 및 저장',
    description: '전체 내용을 확인하고 저장합니다.',
    stepKeys: ['final'],
  },
];

export function buildWizardSections(steps: WizardStepDefinition[]): WizardSection[] {
  return SECTION_DEFINITIONS.flatMap((definition) => {
    const allowedStepKeys = new Set(definition.stepKeys);
    const sectionSteps = steps.filter((step) => allowedStepKeys.has(step.key));

    if (sectionSteps.length === 0) {
      return [];
    }

    return [{
      id: definition.id,
      title: definition.title,
      description: definition.description,
      steps: sectionSteps,
    }];
  });
}

export function flattenWizardSectionStepKeys(
  sections: WizardSection[]
): WizardStepKey[] {
  return sections.flatMap((section) => section.steps.map((step) => step.key));
}

export function findWizardSectionByStepKey(
  sections: WizardSection[],
  stepKey: WizardStepKey
): WizardSection | null {
  return sections.find((section) =>
    section.steps.some((step) => step.key === stepKey)
  ) ?? null;
}

export function getAdjacentWizardSection(
  sections: WizardSection[],
  sectionId: WizardSectionId,
  offset: -1 | 1
): WizardSection | null {
  const currentIndex = sections.findIndex((section) => section.id === sectionId);

  if (currentIndex < 0) {
    return null;
  }

  return sections[currentIndex + offset] ?? null;
}

export function getWizardSectionValidation(
  section: WizardSection,
  getValidationForStep: (stepKey: WizardStepKey) => StepValidation
): WizardSectionValidation {
  const validations = section.steps.map((step) => ({
    stepKey: step.key,
    validation: getValidationForStep(step.key),
  }));
  const invalidValidations = validations.filter(({ validation }) => !validation.valid);

  return {
    valid: invalidValidations.length === 0,
    messages: invalidValidations.flatMap(({ validation }) => validation.messages),
    invalidStepKeys: invalidValidations.map(({ stepKey }) => stepKey),
  };
}
