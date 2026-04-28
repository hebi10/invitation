import { useCallback, useState } from 'react';

export function useWizardVisibilityState(initialPublished = false) {
  const [published, setPublished] = useState(initialPublished);

  const applyPublishedState = useCallback((nextPublished: boolean) => {
    setPublished(nextPublished);
  }, []);

  const resetPublishedState = useCallback(() => {
    setPublished(false);
  }, []);

  return {
    published,
    setPublished,
    applyPublishedState,
    resetPublishedState,
  };
}
