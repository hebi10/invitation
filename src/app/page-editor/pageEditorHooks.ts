import { useEffect, useMemo } from 'react';

import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { InvitationPageSeed } from '@/types/invitationPage';

import {
  EDITOR_STEPS,
  STEP_MAP,
  type EditorStepKey,
} from './pageEditorContent';
import {
  buildStepReviews,
  findFirstInvalidRequiredStep,
  getNextStepKey,
  getPreviousStepKey,
} from './pageEditorDerivedState';

export function usePageEditorProgress({
  formState,
  activeStep,
}: {
  formState: InvitationPageSeed | null;
  activeStep: EditorStepKey | null;
}) {
  const stepReviews = useMemo(() => buildStepReviews(formState), [formState]);
  const invitationFeatures = useMemo(
    () => resolveInvitationFeatures(formState?.productTier, formState?.features),
    [formState?.features, formState?.productTier]
  );
  const firstInvalidRequiredStep = useMemo(
    () => findFirstInvalidRequiredStep(stepReviews),
    [stepReviews]
  );
  const totalRequiredFields = useMemo(
    () =>
      EDITOR_STEPS.filter((step) => !step.isOptional).reduce(
        (total, step) => total + stepReviews[step.key].requiredCount,
        0
      ),
    [stepReviews]
  );
  const completedRequiredFields = useMemo(
    () =>
      EDITOR_STEPS.filter((step) => !step.isOptional).reduce(
        (total, step) => total + stepReviews[step.key].completedRequiredCount,
        0
      ),
    [stepReviews]
  );
  const progressPercent =
    totalRequiredFields > 0
      ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
      : 0;
  const currentStepKey = activeStep ?? 'basic';
  const currentStep = STEP_MAP[currentStepKey];
  const currentReview = stepReviews[currentStepKey];
  const previousStepKey = useMemo(() => getPreviousStepKey(activeStep), [activeStep]);
  const previousStep = previousStepKey ? STEP_MAP[previousStepKey] : null;
  const nextStepKey = useMemo(() => getNextStepKey(activeStep), [activeStep]);
  const nextStep = nextStepKey ? STEP_MAP[nextStepKey] : null;

  return {
    stepReviews,
    invitationFeatures,
    maxGalleryImages: invitationFeatures.maxGalleryImages,
    firstInvalidRequiredStep,
    totalRequiredFields,
    completedRequiredFields,
    progressPercent,
    currentStepKey,
    currentStep,
    currentReview,
    previousStepKey,
    previousStep,
    nextStepKey,
    nextStep,
  };
}

export function usePageEditorAutosave({
  enabled,
  delayMs,
  onAutosave,
}: {
  enabled: boolean;
  delayMs: number;
  onAutosave: () => void;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onAutosave();
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [delayMs, enabled, onAutosave]);
}
