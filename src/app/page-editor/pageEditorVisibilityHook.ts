import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  saveInvitationPageConfig,
  setInvitationPagePublished,
} from '@/services/invitationPageService';
import type {
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';

import { STEP_MAP, type EditorStepKey } from './pageEditorContent';
import type { NoticeState, SaveState } from './pageEditorClientTypes';
import {
  cloneConfig,
  prepareConfigForSave,
} from './pageEditorUtils';

export function usePageEditorVisibility({
  slug,
  formState,
  published,
  hasConfigChanges,
  defaultTheme,
  firstInvalidRequiredStep,
  jumpToStep,
  setFormState,
  setBaselineState,
  setBaselinePublished,
  setHasCustomConfig,
  setDataSourceLabel,
  setLastSavedAt,
  setSaveState,
  setNotice,
  syncEditableQueryCache,
  invalidateEditorCaches,
}: {
  slug: string;
  formState: InvitationPageSeed | null;
  published: boolean;
  hasConfigChanges: boolean;
  defaultTheme: InvitationThemeKey;
  firstInvalidRequiredStep: EditorStepKey | null;
  jumpToStep: (stepKey: EditorStepKey) => void;
  setFormState: Dispatch<SetStateAction<InvitationPageSeed | null>>;
  setBaselineState: Dispatch<SetStateAction<InvitationPageSeed | null>>;
  setBaselinePublished: Dispatch<SetStateAction<boolean>>;
  setHasCustomConfig: Dispatch<SetStateAction<boolean>>;
  setDataSourceLabel: Dispatch<SetStateAction<string>>;
  setLastSavedAt: Dispatch<SetStateAction<Date | null>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  setNotice: Dispatch<SetStateAction<NoticeState>>;
  syncEditableQueryCache: (
    nextConfig: InvitationPageSeed,
    nextPublished: boolean,
    nextLastSavedAt: Date
  ) => void;
  invalidateEditorCaches: () => Promise<void>;
}) {
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  const handleApplyVisibility = useCallback(async () => {
    if (published && firstInvalidRequiredStep) {
      const step = STEP_MAP[firstInvalidRequiredStep];
      jumpToStep(firstInvalidRequiredStep);
      setNotice({
        tone: 'error',
        message: `${step.step} 단계의 필수 정보를 먼저 입력해 주세요.`,
      });
      return;
    }

    setIsSavingVisibility(true);
    setSaveState('publishing');

    try {
      if (hasConfigChanges && formState) {
        const nextConfig = prepareConfigForSave(formState, slug);
        await saveInvitationPageConfig(nextConfig, {
          published,
          defaultTheme,
        });
        const savedAt = new Date();
        setFormState(cloneConfig(nextConfig));
        setBaselineState(cloneConfig(nextConfig));
        setHasCustomConfig(true);
        setDataSourceLabel('맞춤 설정 사용 중');
        syncEditableQueryCache(nextConfig, published, savedAt);
      } else {
        await setInvitationPagePublished(slug, published, {
          defaultTheme,
        });
      }

      setBaselinePublished(published);
      const savedAt = new Date();
      setLastSavedAt(savedAt);
      if (formState && !hasConfigChanges) {
        syncEditableQueryCache(formState, published, savedAt);
      }
      await invalidateEditorCaches();
      setSaveState('saved');
      setNotice({
        tone: 'success',
        message: published ? '발행 상태를 반영했습니다.' : '비공개 상태를 반영했습니다.',
      });
    } catch (error) {
      console.error('[PageEditorClient] failed to apply visibility', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '발행 상태를 반영하지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsSavingVisibility(false);
    }
  }, [
    defaultTheme,
    firstInvalidRequiredStep,
    formState,
    hasConfigChanges,
    invalidateEditorCaches,
    jumpToStep,
    published,
    setBaselinePublished,
    setBaselineState,
    setDataSourceLabel,
    setFormState,
    setHasCustomConfig,
    setLastSavedAt,
    setNotice,
    setSaveState,
    slug,
    syncEditableQueryCache,
  ]);

  return {
    isSavingVisibility,
    handleApplyVisibility,
  };
}
