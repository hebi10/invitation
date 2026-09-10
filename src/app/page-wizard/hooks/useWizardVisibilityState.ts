import { useCallback, useState } from 'react';

export function useWizardVisibilityState(initialPublished = false) {
  const [published, setPublished] = useState(initialPublished);
  const [persistedPublished, setPersistedPublished] = useState(initialPublished);

  const applyPublishedState = useCallback((nextPublished: boolean) => {
    setPublished(nextPublished);
    setPersistedPublished(nextPublished);
  }, []);

  const resetPublishedState = useCallback(() => {
    setPublished(false);
    setPersistedPublished(false);
  }, []);

  return {
    published,
    persistedPublished,
    setPersistedPublished,
    setPublished,
    applyPublishedState,
    resetPublishedState,
  };
}
