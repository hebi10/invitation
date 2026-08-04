import type { WizardStepKey } from './pageWizardData';

type WizardStepFocusTarget = {
  scrollIntoView: (options: ScrollIntoViewOptions) => void;
  focus: (options: FocusOptions) => void;
};

type ResolveWizardStepTarget = (
  stepKey: WizardStepKey
) => WizardStepFocusTarget | null;

const resolveWizardStepTarget: ResolveWizardStepTarget = (stepKey) => {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector<HTMLElement>(`[data-step-key="${stepKey}"]`);
};

export function revealWizardStep(
  stepKey: WizardStepKey,
  resolveTarget: ResolveWizardStepTarget = resolveWizardStepTarget
) {
  const target = resolveTarget(stepKey);

  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
  return true;
}
