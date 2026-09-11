import { DEMO_EXPERIENCE_IMAGE_OPTIONS } from '@/config/demoExperienceSeeds';
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
  experience = false,
  activeStepKey,
  defaultTheme,
  previewFormState,
  slugStepState,
  steps,
}: {
  experience?: boolean;
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
        cloneSlugStepState(slugStepState),
        experience ? DEMO_EXPERIENCE_IMAGE_OPTIONS : []
      ),
    [defaultTheme, previewFormState, slugStepState, experience]
  );

  const finalReviewSummary = useMemo(() => {
    if (!previewFormState || activeStepKey !== 'final') {
      return [];
    }

    return buildReviewSummary(
      steps,
      defaultTheme,
      previewFormState,
      cloneSlugStepState(slugStepState),
        experience ? DEMO_EXPERIENCE_IMAGE_OPTIONS : []
    );
  }, [activeStepKey, defaultTheme, previewFormState, slugStepState, steps, experience]);

  return {
    getValidationForStep,
    finalReviewSummary,
  };
}
