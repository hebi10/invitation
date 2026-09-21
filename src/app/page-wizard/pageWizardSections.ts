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
  | 'music'
  | 'accounts'
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
    description: '관리자가 초대장을 생성하고 고객 계정을 연결합니다.',
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
    title: '인사말',
    description: '초대하는 마음과 서명을 작성합니다.',
    stepKeys: ['greeting'],
  },
  {
    id: 'media',
    title: '사진',
    description: '대표 사진과 갤러리 순서를 확인합니다.',
    stepKeys: ['images'],
  },
  {
    id: 'music',
    title: '연출·음악',
    description: '첫 화면 연출과 배경음악을 선택합니다.',
    stepKeys: ['music'],
  },
  {
    id: 'accounts',
    title: '계좌',
    description: '마음 전하실 곳과 안내 문구를 확인합니다.',
    stepKeys: ['extra'],
  },
  {
    id: 'review',
    title: '공유·최종 확인',
    description: '링크 카드와 입력 내용을 확인한 뒤 저장합니다.',
    stepKeys: ['final'],
  },
];

export function buildWizardSections(steps: WizardStepDefinition[], _eventType?: string): WizardSection[] {
  const definitions = _eventType === 'wedding' ? SECTION_DEFINITIONS : SECTION_DEFINITIONS
    .filter(definition => definition.id !== 'music' && definition.id !== 'accounts')
    .map(definition => definition.id === 'media'
      ? { ...definition, title: '사진과 부가 기능', description: '사진, 음악과 추가 안내를 설정합니다.', stepKeys: ['images', 'music', 'extra'] as WizardStepKey[] }
      : definition.id === 'greeting' ? { ...definition, title: '인사말과 관계 정보' }
      : definition.id === 'review' ? { ...definition, title: '검토 및 저장' } : definition);
  return definitions.flatMap((definition) => {
    const allowedStepKeys = new Set<WizardStepKey>(definition.stepKeys);
    const sectionSteps = steps.filter((step) => allowedStepKeys.has(step.key));

    if (sectionSteps.length === 0) {
      return [];
    }

    return [{
      id: definition.id,
      title: _eventType === 'wedding' && definition.id === 'basic' ? '기본·가족' : definition.title,
      description: definition.description,
      steps: _eventType === 'wedding' ? sectionSteps.map(step => {
        const copy: Partial<Record<WizardStepKey, { title: string; description: string }>> = {
          basic: { title: '기본·가족', description: '이름을 입력하고 필요한 가족 연락처를 추가해 주세요.' },
          greeting: { title: '인사말', description: '직접 작성하거나 템플릿을 미리 보고 적용하세요.' },
          extra: { title: '계좌', description: '계좌 안내는 선택 사항입니다.' },
          final: { title: '공유 카드 설정', description: '보내는 링크의 이미지와 문구를 함께 확인하세요.' },
        };
        return { ...step, ...copy[step.key] };
      }) : sectionSteps,
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
