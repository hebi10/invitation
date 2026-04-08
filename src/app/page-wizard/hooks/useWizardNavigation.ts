import { useCallback, useMemo } from 'react';

import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

import {
  buildReviewSummary,
  WIZARD_STEPS,
  type SlugStepState,
  type StepValidation,
  type WizardStepKey,
} from '../pageWizardData';
import { getStepIndex } from '../pageWizardShared';
import type { WizardPersistDraftOptions } from './useWizardPersistence';

export function useWizardNavigation({
  activeStepKey,
  defaultTheme,
  previewFormState,
  slugStepState,
  published,
  resolvedPersistedSlug,
  getValidationForStep,
  persistDraft,
  slideToStep,
  clearNotice,
  showNotice,
  showErrorNotice,
  onComplete,
}: {
  activeStepKey: WizardStepKey;
  defaultTheme: InvitationThemeKey;
  previewFormState: InvitationPageSeed | null;
  slugStepState: SlugStepState;
  published: boolean;
  resolvedPersistedSlug: string | null;
  getValidationForStep: (stepKey: WizardStepKey) => StepValidation;
  persistDraft: (options?: WizardPersistDraftOptions) => Promise<string | null>;
  slideToStep: (stepKey: WizardStepKey) => void;
  clearNotice: () => void;
  showNotice: (tone: 'success' | 'error' | 'neutral', message: string) => void;
  showErrorNotice: (error: unknown, fallback?: string) => void;
  onComplete?: (savedSlug: string) => void;
}) {
  const activeStep = useMemo(
    () => WIZARD_STEPS[getStepIndex(activeStepKey)] ?? WIZARD_STEPS[0],
    [activeStepKey]
  );
  const activeStepIndex = useMemo(
    () => getStepIndex(activeStep.key),
    [activeStep.key]
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
    const validation = getValidationForStep(activeStep.key);

    if (!validation.valid) {
      showErrorNotice(validation.messages[0] ?? '현재 단계 입력값을 먼저 확인해 주세요.');
      return;
    }

    if (activeStep.key === 'slug') {
      let nextSlug = resolvedPersistedSlug;

      if (!nextSlug) {
        const savedSlug = await persistDraft({
          publish: false,
          successMessage: '페이지를 생성했습니다. 다음 단계로 이동합니다.',
        });

        if (!savedSlug) {
          return;
        }

        nextSlug = savedSlug;
      }

      if (nextSlug && typeof window !== 'undefined') {
        const nextPath = `/page-wizard/${encodeURIComponent(nextSlug)}`;
        const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;

        if (window.location.pathname !== nextPath) {
          window.history.replaceState(null, '', nextUrl);
        }
      }
    } else if (activeStep.key !== 'theme' && activeStep.key !== 'final') {
      const savedSlug = await persistDraft({ publish: false, silent: true });
      if (!savedSlug && !resolvedPersistedSlug) {
        return;
      }
    }

    const nextStep = WIZARD_STEPS[getStepIndex(activeStep.key) + 1];
    if (!nextStep) {
      return;
    }

    slideToStep(nextStep.key);

    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }

    showNotice('neutral', `${nextStep.number}단계로 이동했습니다.`);
  }, [
    activeStep.key,
    getValidationForStep,
    persistDraft,
    resolvedPersistedSlug,
    showErrorNotice,
    showNotice,
    slideToStep,
  ]);

  const handleMovePrevious = useCallback(() => {
    const previousStep = WIZARD_STEPS[getStepIndex(activeStep.key) - 1];
    if (!previousStep) {
      return;
    }

    slideToStep(previousStep.key);
    clearNotice();
  }, [activeStep.key, clearNotice, slideToStep]);

  const handleFinalConfirm = useCallback(async () => {
    const reviewSummary = buildReviewSummary(defaultTheme, previewFormState, {
      ...slugStepState,
    });
    const invalidStep = reviewSummary.find((item) => !item.validation.valid);

    if (invalidStep) {
      slideToStep(invalidStep.step.key);
      scrollToTop();
      showErrorNotice(
        invalidStep.validation.messages[0] ??
          `${invalidStep.step.number}단계를 먼저 확인해 주세요.`
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
  ]);

  const handleSaveCurrent = useCallback(async () => {
    await persistDraft({
      publish: published,
      successMessage: '현재 단계 내용을 저장했습니다.',
    });
  }, [persistDraft, published]);

  return {
    activeStep,
    activeStepIndex,
    handleMoveNext,
    handleMovePrevious,
    handleFinalConfirm,
    handleSaveCurrent,
  };
}
