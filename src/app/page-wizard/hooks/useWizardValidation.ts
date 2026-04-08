import { useCallback, useMemo } from 'react';

import type { InvitationPageSeed, InvitationThemeKey } from '@/types/invitationPage';

import {
  buildStepValidation,
  buildReviewSummary,
  type WizardStepDefinition,
  type SlugStepState,
  type WizardStepKey,
} from '../pageWizardData';

function cloneSlugStepState(slugStepState: SlugStepState): SlugStepState {
  return {
    ...slugStepState,
  };
}

export function useWizardValidation({
  activeStepKey,
  defaultTheme,
  previewFormState,
  slugStepState,
  steps,
}: {
  activeStepKey: WizardStepKey;
  defaultTheme: InvitationThemeKey;
  previewFormState: InvitationPageSeed | null;
  slugStepState: SlugStepState;
  steps: WizardStepDefinition[];
}) {
  const getValidationForStep = useCallback(
    (stepKey: WizardStepKey) =>
      buildStepValidation(
        stepKey,
        defaultTheme,
        previewFormState,
        cloneSlugStepState(slugStepState)
      ),
    [defaultTheme, previewFormState, slugStepState]
  );

  const finalReviewSummary = useMemo(() => {
    if (!previewFormState || activeStepKey !== 'final') {
      return [];
    }

    return buildReviewSummary(
      steps,
      defaultTheme,
      previewFormState,
      cloneSlugStepState(slugStepState)
    );
  }, [activeStepKey, defaultTheme, previewFormState, slugStepState, steps]);

  return {
    getValidationForStep,
    finalReviewSummary,
  };
}
