import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';

import type {
  CreateDraftItem,
  MobileInvitationCreationInput,
  MobileInvitationDashboard,
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  MobilePageSummary,
  MobileSessionSummary,
  PendingManageOnboarding,
} from '../types/mobileInvitation';
import type { FontScalePreference, ThemePreference } from '../constants/theme';
import type { getPalette } from '../constants/theme';

import { AuthProvider, useAuth } from './AuthContext';
import { DraftsProvider, useDrafts } from './DraftsContext';
import {
  InvitationOpsProvider,
  useInvitationOps,
} from './InvitationOpsContext';
import { PreferencesProvider, usePreferences } from './PreferencesContext';

type CreateDraftInput = Omit<CreateDraftItem, 'id' | 'createdAt' | 'status'>;

export type AppStateContextValue = {
  apiBaseUrl: string;
  setApiBaseUrl: (value: string) => Promise<void>;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  fontScalePreference: FontScalePreference;
  setFontScalePreference: (value: FontScalePreference) => Promise<void>;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  session: MobileSessionSummary | null;
  pageSummary: MobilePageSummary | null;
  dashboard: MobileInvitationDashboard | null;
  dashboardLoading: boolean;
  drafts: CreateDraftItem[];
  pendingManageOnboarding: PendingManageOnboarding | null;
  login: (pageIdentifier: string, password: string) => Promise<boolean>;
  createInvitationPage: (
    input: MobileInvitationCreationInput
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshDashboard: () => Promise<boolean>;
  saveCurrentPageConfig: (
    config: MobileInvitationSeed,
    options?: {
      published?: boolean;
      defaultTheme?: MobileInvitationThemeKey;
    }
  ) => Promise<boolean>;
  setPublishedState: (published: boolean) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  saveDraft: (
    input: CreateDraftInput,
    options?: {
      draftId?: string;
    }
  ) => Promise<string>;
  removeDraft: (draftId: string) => Promise<void>;
  clearAuthError: () => void;
  clearPendingManageOnboarding: () => void;
};

export function AppStateProvider({ children }: PropsWithChildren) {
  return (
    <PreferencesProvider>
      <DraftsProvider>
        <AuthProvider>
          <InvitationOpsProvider>{children}</InvitationOpsProvider>
        </AuthProvider>
      </DraftsProvider>
    </PreferencesProvider>
  );
}

/**
 * @deprecated 역할별 Context 훅(usePreferences/useAuth/useInvitationOps/useDrafts)으로
 * 점진 교체 예정. 신규 코드는 세분화된 훅을 우선 사용한다.
 */
export function useAppState(): AppStateContextValue {
  const {
    apiBaseUrl,
    setApiBaseUrl,
    themePreference,
    setThemePreference,
    fontScalePreference,
    setFontScalePreference,
    palette,
    fontScale,
    isReady: isPreferencesReady,
  } = usePreferences();

  const { drafts, isReady: isDraftsReady, saveDraft, removeDraft } = useDrafts();

  const {
    session,
    isAuthenticated,
    isAuthenticating,
    isReady: isAuthReady,
    authError,
    pendingManageOnboarding,
    login,
    createInvitationPage,
    logout,
    clearAuthError,
    clearPendingManageOnboarding,
  } = useAuth();

  const {
    dashboard,
    pageSummary,
    dashboardLoading,
    refreshDashboard,
    saveCurrentPageConfig,
    setPublishedState,
    deleteComment,
  } = useInvitationOps();

  const isBootstrapping = !(isPreferencesReady && isDraftsReady && isAuthReady);

  return useMemo<AppStateContextValue>(
    () => ({
      apiBaseUrl,
      setApiBaseUrl,
      themePreference,
      setThemePreference,
      fontScalePreference,
      setFontScalePreference,
      palette,
      fontScale,
      isBootstrapping,
      isAuthenticated,
      isAuthenticating,
      authError,
      session,
      pageSummary,
      dashboard,
      dashboardLoading,
      drafts,
      pendingManageOnboarding,
      login,
      createInvitationPage,
      logout,
      refreshDashboard,
      saveCurrentPageConfig,
      setPublishedState,
      deleteComment,
      saveDraft,
      removeDraft,
      clearAuthError,
      clearPendingManageOnboarding,
    }),
    [
      apiBaseUrl,
      authError,
      clearAuthError,
      clearPendingManageOnboarding,
      createInvitationPage,
      dashboard,
      dashboardLoading,
      deleteComment,
      drafts,
      fontScale,
      fontScalePreference,
      isAuthenticated,
      isAuthenticating,
      isBootstrapping,
      login,
      logout,
      pageSummary,
      palette,
      pendingManageOnboarding,
      refreshDashboard,
      removeDraft,
      saveCurrentPageConfig,
      saveDraft,
      session,
      setApiBaseUrl,
      setFontScalePreference,
      setPublishedState,
      setThemePreference,
      themePreference,
    ]
  );
}
