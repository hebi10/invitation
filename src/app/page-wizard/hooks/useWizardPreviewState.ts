import { useCallback, useState } from 'react';

import type { WizardStepKey } from '../pageWizardData';
import type {
  ChoicePanelKey,
  SlideViewMode,
} from '../pageWizardShared';

export function useWizardPreviewState() {
  const [viewModeByStep, setViewModeByStep] = useState<
    Partial<Record<WizardStepKey, SlideViewMode>>
  >({});
  const [openChoicePanel, setOpenChoicePanel] = useState<ChoicePanelKey>(null);

  const getStepViewMode = useCallback(
    (stepKey: WizardStepKey): SlideViewMode => viewModeByStep[stepKey] ?? 'input',
    [viewModeByStep]
  );

  const setStepViewMode = useCallback((stepKey: WizardStepKey, mode: SlideViewMode) => {
    setViewModeByStep((current) => {
      if (current[stepKey] === mode) {
        return current;
      }

      return {
        ...current,
        [stepKey]: mode,
      };
    });
  }, []);

  const toggleChoicePanel = useCallback((panel: Exclude<ChoicePanelKey, null>) => {
    setOpenChoicePanel((current) => (current === panel ? null : panel));
  }, []);

  return {
    openChoicePanel,
    setOpenChoicePanel,
    getStepViewMode,
    setStepViewMode,
    toggleChoicePanel,
  };
}
