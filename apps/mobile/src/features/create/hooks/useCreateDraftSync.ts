import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { CreateDraftItem } from '../../../types/mobileInvitation';

type UseCreateDraftSyncOptions = {
  drafts: CreateDraftItem[];
  clearAuthError: () => void;
  setNotice: (message: string) => void;
  applyDraft: (draft: CreateDraftItem) => void;
};

export function useCreateDraftSync({
  drafts,
  clearAuthError,
  setNotice,
  applyDraft,
}: UseCreateDraftSyncOptions) {
  const router = useRouter();
  const { draftId: draftIdParam } = useLocalSearchParams<{
    draftId?: string | string[];
  }>();
  const normalizedDraftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;

  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedDraftId) {
      setLoadedDraftId(null);
      return;
    }

    if (normalizedDraftId === loadedDraftId) {
      return;
    }

    const selectedDraft = drafts.find((draft) => draft.id === normalizedDraftId);
    if (!selectedDraft) {
      return;
    }

    applyDraft(selectedDraft);
    setEditingDraftId(selectedDraft.id);
    setLoadedDraftId(selectedDraft.id);
    clearAuthError();
    setNotice(
      '저장한 초안을 불러왔습니다. 비밀번호만 다시 입력하면 이어서 진행할 수 있습니다.'
    );
    router.replace('/create');
  }, [
    applyDraft,
    clearAuthError,
    drafts,
    loadedDraftId,
    normalizedDraftId,
    router,
    setNotice,
  ]);

  const resetDraftSync = useCallback(() => {
    setEditingDraftId(null);
    setLoadedDraftId(null);
  }, []);

  return {
    editingDraftId,
    setEditingDraftId,
    resetDraftSync,
  };
}
