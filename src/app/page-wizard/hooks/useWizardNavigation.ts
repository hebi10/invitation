import { useCallback, useMemo } from 'react';

import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

import {
  buildReviewSummary,
  type WizardStepDefinition,
  type SlugStepState,
  type StepValidation,
  type WizardStepKey,
} from '../pageWizardData';
import {
  findWizardSectionByStepKey,
  getAdjacentWizardSection,
  getWizardSectionValidation,
  type WizardSection,
  type WizardSectionId,
} from '../pageWizardSections';
import { getStepIndex } from '../pageWizardShared';
import type { WizardPersistDraftOptions } from './useWizardPersistence';

export function useWizardNavigation({
  activeStepKey,
  defaultTheme,
  previewFormState,
  slugStepState,
  published,
  resolvedPersistedSlug,
  steps,
  sections,
  getValidationForStep,
  persistDraft,
  getEditPath,
  slideToStep,
  clearNotice,
  showErrorNotice,
  onComplete,
}: {
  activeStepKey: WizardStepKey;
  defaultTheme: InvitationThemeKey;
  previewFormState: InvitationPageSeed | null;
  slugStepState: SlugStepState;
  published: boolean;
  resolvedPersistedSlug: string | null;
  steps: WizardStepDefinition[];
  sections: WizardSection[];
  getValidationForStep: (stepKey: WizardStepKey) => StepValidation;
  persistDraft: (options?: WizardPersistDraftOptions) => Promise<string | null>;
  getEditPath: (slug: string) => string;
  slideToStep: (stepKey: WizardStepKey) => void;
  clearNotice: () => void;
  showErrorNotice: (
    error: unknown,
    fallback?: string,
    source?: 'general' | 'save' | 'validation'
  ) => void;
  onComplete?: (savedSlug: string) => void;
}) {
  const activeStep = useMemo(
    () => steps[getStepIndex(activeStepKey, steps)] ?? steps[0],
    [activeStepKey, steps]
  );
  const activeStepIndex = useMemo(
    () => getStepIndex(activeStep.key, steps),
    [activeStep.key, steps]
  );
  const activeSection = useMemo(
    () => findWizardSectionByStepKey(sections, activeStep.key) ?? sections[0],
    [activeStep.key, sections]
  );
  const activeSectionIndex = useMemo(
    () => sections.findIndex((section) => section.id === activeSection.id),
    [activeSection.id, sections]
  );

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  const handleMoveNext = useCallback(async () => {
    const validation = getWizardSectionValidation(activeSection, getValidationForStep);

    if (!validation.valid) {
      const invalidStepKey = validation.invalidStepKeys[0];

      if (invalidStepKey) {
        slideToStep(invalidStepKey);
      }

      showErrorNotice(
        validation.messages[0] ?? '현재 단계 입력값을 먼저 확인해 주세요.',
        undefined,
        'validation'
      );
      return;
    }

    if (activeSection.steps.some((step) => step.key === 'slug')) {
      let nextSlug = resolvedPersistedSlug;
      const savedSlug = await persistDraft({
        publish: false,
        silent: Boolean(nextSlug),
        successMessage: '페이지를 생성했습니다. 다음 단계로 이동합니다.',
      });

      if (!savedSlug) {
        return;
      }

      nextSlug = savedSlug;

      if (nextSlug && typeof window !== 'undefined') {
        const nextPath = getEditPath(nextSlug);
        const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;

        if (window.location.pathname !== nextPath) {
          window.history.replaceState(null, '', nextUrl);
        }
      }
    } else if (activeSection.id !== 'review' && resolvedPersistedSlug) {
      const savedSlug = await persistDraft({ publish: false, silent: true });
      if (!savedSlug) {
        return;
      }
    }

    const nextSection = getAdjacentWizardSection(sections, activeSection.id, 1);
    const nextStepKey = nextSection?.steps[0]?.key;
    if (!nextStepKey) {
      return;
    }

    slideToStep(nextStepKey);
    scrollToTop();
  }, [
    activeSection,
    getValidationForStep,
    getEditPath,
    persistDraft,
    resolvedPersistedSlug,
    scrollToTop,
    showErrorNotice,
    slideToStep,
    sections,
  ]);

  const handleMovePrevious = useCallback(() => {
    const previousSection = getAdjacentWizardSection(sections, activeSection.id, -1);
    const previousStepKey = previousSection?.steps[0]?.key;
    if (!previousStepKey) {
      return;
    }

    slideToStep(previousStepKey);
    clearNotice();
    scrollToTop();
  }, [activeSection.id, clearNotice, scrollToTop, sections, slideToStep]);

  const handleSelectSection = useCallback((sectionId: WizardSectionId) => {
    const section = sections.find((candidate) => candidate.id === sectionId);
    const firstStepKey = section?.steps[0]?.key;

    if (!firstStepKey) {
      return;
    }

    slideToStep(firstStepKey);
    clearNotice();
    scrollToTop();
  }, [clearNotice, scrollToTop, sections, slideToStep]);

  const handleFinalConfirm = useCallback(async () => {
    const reviewSummary = buildReviewSummary(steps, defaultTheme, previewFormState, {
      ...slugStepState,
    });
    const invalidStep = reviewSummary.find((item) => !item.validation.valid);

    if (invalidStep) {
      slideToStep(invalidStep.step.key);
      scrollToTop();
      showErrorNotice(
        invalidStep.validation.messages[0] ??
          `${invalidStep.step.number}단계를 먼저 확인해 주세요.`,
        undefined,
        'validation'
      );
      return;
    }

    const savedSlug = await persistDraft({
      publish: published,
      successMessage: published
        ? '페이지를 공개했습니다.'
        : '초안을 저장했습니다.',
    });

    if (!savedSlug) {
      return;
    }

    scrollToTop();
    onComplete?.(savedSlug);
  }, [
    defaultTheme,
    onComplete,
    persistDraft,
    previewFormState,
    published,
    scrollToTop,
    showErrorNotice,
    slideToStep,
    slugStepState,
    steps,
  ]);

  return {
    activeStep,
    activeStepIndex,
    activeSection,
    activeSectionIndex,
    handleMoveNext,
    handleMovePrevious,
    handleSelectSection,
    handleFinalConfirm,
  };
}
