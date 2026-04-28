import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  restoreInvitationPageConfig,
  saveInvitationPageConfig,
} from '@/services/invitationPageService';
import type {
  InvitationPageSeed,
  InvitationThemeKey,
} from '@/types/invitationPage';

import { usePageEditorAutosave } from './pageEditorHooks';
import type { EditablePageEditorConfig } from './pageEditorDataHooks';
import type { NoticeState, SaveState } from './pageEditorClientTypes';
import {
  cloneConfig,
  prepareConfigForSave,
} from './pageEditorUtils';

const AUTOSAVE_DELAY_MS = 1500;

type RefetchEditableConfig = () => Promise<{
  data?: EditablePageEditorConfig;
  error?: unknown;
}>;

export function usePageEditorPersistence({
  slug,
  formState,
  baselinePublished,
  defaultTheme,
  hasConfigChanges,
  hasPublishChanges,
  isDirty,
  canEdit,
  isLoading,
  isSavingVisibility,
  refetchConfig,
  applyLoadedConfig,
  setFormState,
  setBaselineState,
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
  baselinePublished: boolean;
  defaultTheme: InvitationThemeKey;
  hasConfigChanges: boolean;
  hasPublishChanges: boolean;
  isDirty: boolean;
  canEdit: boolean;
  isLoading: boolean;
  isSavingVisibility: boolean;
  refetchConfig: RefetchEditableConfig;
  applyLoadedConfig: (config: EditablePageEditorConfig) => void;
  setFormState: Dispatch<SetStateAction<InvitationPageSeed | null>>;
  setBaselineState: Dispatch<SetStateAction<InvitationPageSeed | null>>;
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
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const persistDraft = useCallback(async (mode: 'manual' | 'auto') => {
    if (!formState) {
      return false;
    }

    if (mode === 'manual') {
      setIsSaving(true);
    }
    setSaveState(mode === 'auto' ? 'autosaving' : 'saving');

    try {
      const nextConfig = prepareConfigForSave(formState, slug);
      await saveInvitationPageConfig(nextConfig, {
        published: baselinePublished,
        defaultTheme,
      });
      const savedAt = new Date();
      setFormState(cloneConfig(nextConfig));
      setBaselineState(cloneConfig(nextConfig));
      setHasCustomConfig(true);
      setDataSourceLabel('맞춤 설정 사용 중');
      setLastSavedAt(savedAt);
      syncEditableQueryCache(nextConfig, baselinePublished, savedAt);
      await invalidateEditorCaches();
      setSaveState('saved');

      if (mode === 'manual') {
        setNotice({
          tone: 'success',
          message: '변경 내용을 임시저장했습니다.',
        });
      }

      return true;
    } catch (error) {
      console.error('[PageEditorClient] failed to save config', error);
      setSaveState('error');

      if (mode === 'manual') {
        setNotice({
          tone: 'error',
          message: '임시저장에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
        });
      }

      return false;
    } finally {
      if (mode === 'manual') {
        setIsSaving(false);
      }
    }
  }, [
    baselinePublished,
    defaultTheme,
    formState,
    invalidateEditorCaches,
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

  usePageEditorAutosave({
    enabled:
      hasConfigChanges &&
      !hasPublishChanges &&
      Boolean(formState) &&
      canEdit &&
      !isLoading &&
      !isSaving &&
      !isSavingVisibility &&
      !isRestoring,
    delayMs: AUTOSAVE_DELAY_MS,
    onAutosave: () => {
      void persistDraft('auto');
    },
  });

  const loadLatestConfig = useCallback(async (successMessage?: string) => {
    setIsRefreshing(true);

    try {
      const refreshed = await refetchConfig();
      if (!refreshed.data) {
        throw refreshed.error ?? new Error('설정 정보를 찾을 수 없습니다.');
      }

      applyLoadedConfig(refreshed.data);
      if (successMessage) {
        setNotice({ tone: 'success', message: successMessage });
      }
    } catch (error) {
      console.error('[PageEditorClient] failed to refresh config', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '최신 설정을 불러오지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [applyLoadedConfig, refetchConfig, setNotice, setSaveState]);

  const handleRefresh = useCallback(async () => {
    if (isDirty && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '저장하지 않은 변경 사항이 사라집니다. 최신 설정을 다시 불러올까요?'
      );
      if (!confirmed) {
        return;
      }
    }

    await loadLatestConfig('최신 설정을 다시 불러왔습니다.');
  }, [isDirty, loadLatestConfig]);

  const handleRestore = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '기본값으로 복원하면 현재 맞춤 설정이 초기화됩니다. 계속할까요?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsRestoring(true);

    try {
      await restoreInvitationPageConfig(slug, {
        published: baselinePublished,
        defaultTheme,
      });
      await invalidateEditorCaches();
      await loadLatestConfig('기본 설정으로 복원했습니다.');
    } catch (error) {
      console.error('[PageEditorClient] failed to restore config', error);
      setSaveState('error');
      setNotice({
        tone: 'error',
        message: '기본 설정으로 복원하지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setIsRestoring(false);
    }
  }, [
    baselinePublished,
    defaultTheme,
    invalidateEditorCaches,
    loadLatestConfig,
    setNotice,
    setSaveState,
    slug,
  ]);

  return {
    isSaving,
    isRefreshing,
    isRestoring,
    persistDraft,
    handleRefresh,
    handleRestore,
  };
}
