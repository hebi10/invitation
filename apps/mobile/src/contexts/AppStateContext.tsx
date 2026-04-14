import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  createMobileInvitationDraft,
  DEFAULT_API_BASE_URL,
  deleteMobileInvitationComment,
  fetchMobileInvitationDashboard,
  loginMobileClientEditor,
  normalizeApiBaseUrl,
  saveMobileInvitationPageConfig,
  setMobileInvitationPublishedState,
  validateMobileClientEditorSession,
} from '../lib/api';
import { extractPageSlugFromIdentifier } from '../lib/pageSlug';
import { getStoredJson, setStoredJson, setStoredString } from '../lib/storage';
import {
  getFontScale,
  getPalette,
  resolveAppColorScheme,
  type FontScalePreference,
  type ThemePreference,
} from '../constants/theme';
import type {
  CreateDraftItem,
  MobileInvitationDashboard,
  MobileInvitationCreationInput,
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  MobilePageSummary,
  MobileSessionSummary,
  PendingManageOnboarding,
} from '../types/mobileInvitation';

const PREFERENCES_STORAGE_KEY = 'mobile-invitation:preferences';
const SESSION_STORAGE_KEY = 'mobile-invitation:session';
const DRAFT_STORAGE_KEY = 'mobile-invitation:drafts';

type StoredPreferences = {
  apiBaseUrl: string;
  themePreference: ThemePreference;
  fontScalePreference: FontScalePreference;
};

type StoredDraftItem = CreateDraftItem & {
  password?: string;
};

type CreateDraftInput = Omit<CreateDraftItem, 'id' | 'createdAt' | 'status'>;

type AppStateContextValue = {
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
  createInvitationPage: (input: MobileInvitationCreationInput) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  saveCurrentPageConfig: (
    config: MobileInvitationSeed,
    options?: {
      published?: boolean;
      defaultTheme?: MobileInvitationThemeKey;
    }
  ) => Promise<boolean>;
  setPublishedState: (published: boolean) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  saveDraft: (input: CreateDraftInput) => Promise<void>;
  removeDraft: (draftId: string) => Promise<void>;
  clearAuthError: () => void;
  clearPendingManageOnboarding: () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

const DEFAULT_PREFERENCES: StoredPreferences = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  themePreference: 'system',
  fontScalePreference: 'normal',
};

function buildPageSummary(dashboard: MobileInvitationDashboard): MobilePageSummary {
  return {
    slug: dashboard.page.slug,
    displayName: dashboard.page.config.displayName,
    published: dashboard.page.published,
    productTier: dashboard.page.productTier,
    defaultTheme: dashboard.page.defaultTheme,
    features: dashboard.page.features,
  };
}

function sanitizeStoredDraft(draft: StoredDraftItem): CreateDraftItem {
  return {
    id: draft.id,
    createdAt: draft.createdAt,
    servicePlan: draft.servicePlan,
    theme: draft.theme,
    pageIdentifier: draft.pageIdentifier,
    groomName: draft.groomName,
    brideName: draft.brideName,
    weddingDate: draft.weddingDate,
    venue: draft.venue,
    estimatedPrice: draft.estimatedPrice,
    ticketCount: draft.ticketCount,
    notes: draft.notes,
    status: 'draft',
  };
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_PREFERENCES.apiBaseUrl);
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>('system');
  const [fontScalePreference, setFontScalePreferenceState] =
    useState<FontScalePreference>('normal');
  const [session, setSession] = useState<MobileSessionSummary | null>(null);
  const [pageSummary, setPageSummary] = useState<MobilePageSummary | null>(null);
  const [dashboard, setDashboard] = useState<MobileInvitationDashboard | null>(null);
  const [drafts, setDrafts] = useState<CreateDraftItem[]>([]);
  const [pendingManageOnboarding, setPendingManageOnboarding] =
    useState<PendingManageOnboarding | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const colorScheme = resolveAppColorScheme(systemColorScheme, themePreference);
  const palette = useMemo(() => getPalette(colorScheme), [colorScheme]);
  const fontScale = useMemo(
    () => getFontScale(fontScalePreference),
    [fontScalePreference]
  );

  const persistPreferences = useCallback(
    async (nextPreferences: StoredPreferences) => {
      setApiBaseUrlState(nextPreferences.apiBaseUrl);
      setThemePreferenceState(nextPreferences.themePreference);
      setFontScalePreferenceState(nextPreferences.fontScalePreference);
      await setStoredJson(PREFERENCES_STORAGE_KEY, nextPreferences);
    },
    []
  );

  const clearSession = useCallback(async () => {
    setSession(null);
    setPageSummary(null);
    setDashboard(null);
    setPendingManageOnboarding(null);
    await setStoredString(SESSION_STORAGE_KEY, null);
  }, []);

  const refreshDashboard = useCallback(
    async (override?: { session?: MobileSessionSummary; baseUrl?: string }) => {
      const activeSession = override?.session ?? session;
      if (!activeSession) {
        return;
      }

      setDashboardLoading(true);

      try {
        const nextDashboard = await fetchMobileInvitationDashboard(
          override?.baseUrl ?? apiBaseUrl,
          activeSession.pageSlug,
          activeSession.token
        );

        setDashboard(nextDashboard);
        setPageSummary(buildPageSummary(nextDashboard));
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : '운영 데이터를 불러오지 못했습니다.'
        );
      } finally {
        setDashboardLoading(false);
      }
    },
    [apiBaseUrl, session]
  );

  const restoreSession = useCallback(
    async (candidateSession: MobileSessionSummary, nextBaseUrl: string) => {
      setIsAuthenticating(true);

      try {
        const response = await validateMobileClientEditorSession(
          nextBaseUrl,
          candidateSession.pageSlug,
          candidateSession.token
        );

        if (!response.authenticated) {
          await clearSession();
          return false;
        }

        setSession(candidateSession);
        setPageSummary(response.page ?? null);
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, candidateSession);
        await refreshDashboard({
          session: candidateSession,
          baseUrl: nextBaseUrl,
        });
        return true;
      } catch {
        await clearSession();
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [clearSession, refreshDashboard]
  );

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      const [storedPreferences, storedDrafts, storedSession] = await Promise.all([
        getStoredJson<StoredPreferences>(PREFERENCES_STORAGE_KEY, DEFAULT_PREFERENCES),
        getStoredJson<StoredDraftItem[]>(DRAFT_STORAGE_KEY, []),
        getStoredJson<MobileSessionSummary | null>(SESSION_STORAGE_KEY, null),
      ]);

      if (!mounted) {
        return;
      }

      const normalizedApiBaseUrl = normalizeApiBaseUrl(storedPreferences.apiBaseUrl);
      const sanitizedDrafts = storedDrafts.map(sanitizeStoredDraft);
      const shouldRewriteDrafts = storedDrafts.some((draft) =>
        Object.prototype.hasOwnProperty.call(draft, 'password')
      );

      setApiBaseUrlState(normalizedApiBaseUrl);
      setThemePreferenceState(storedPreferences.themePreference);
      setFontScalePreferenceState(storedPreferences.fontScalePreference);
      setDrafts(sanitizedDrafts);

      if (shouldRewriteDrafts) {
        await setStoredJson(DRAFT_STORAGE_KEY, sanitizedDrafts);
      }

      if (storedSession) {
        await restoreSession(storedSession, normalizedApiBaseUrl);
      }

      if (mounted) {
        setIsBootstrapping(false);
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, [restoreSession]);

  const setApiBaseUrl = useCallback(
    async (value: string) => {
      const normalized = normalizeApiBaseUrl(value);
      await persistPreferences({
        apiBaseUrl: normalized,
        themePreference,
        fontScalePreference,
      });

      if (session) {
        await clearSession();
      }
    },
    [clearSession, fontScalePreference, persistPreferences, session, themePreference]
  );

  const setThemePreference = useCallback(
    async (value: ThemePreference) => {
      await persistPreferences({
        apiBaseUrl,
        themePreference: value,
        fontScalePreference,
      });
    },
    [apiBaseUrl, fontScalePreference, persistPreferences]
  );

  const setFontScalePreference = useCallback(
    async (value: FontScalePreference) => {
      await persistPreferences({
        apiBaseUrl,
        themePreference,
        fontScalePreference: value,
      });
    },
    [apiBaseUrl, persistPreferences, themePreference]
  );

  const login = useCallback(
    async (pageIdentifier: string, password: string) => {
      const pageSlug = extractPageSlugFromIdentifier(pageIdentifier);
      const normalizedPassword = password.trim();

      if (!pageSlug || !normalizedPassword) {
        setAuthError('페이지 URL 또는 슬러그와 비밀번호를 입력해 주세요.');
        return false;
      }

      setIsAuthenticating(true);

      try {
        const response = await loginMobileClientEditor(
          apiBaseUrl,
          pageSlug,
          normalizedPassword
        );

        const nextSession = response.session;
        setSession(nextSession);
        setPageSummary(response.page);
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, nextSession);
        await refreshDashboard({
          session: nextSession,
          baseUrl: apiBaseUrl,
        });
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : '로그인에 실패했습니다. 다시 시도해 주세요.'
        );
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [apiBaseUrl, refreshDashboard]
  );

  const createInvitationPage = useCallback(
    async (input: MobileInvitationCreationInput) => {
      setIsAuthenticating(true);

      try {
        const response = await createMobileInvitationDraft(apiBaseUrl, input);
        const nextSession = response.session;

        setSession(nextSession);
        setPageSummary(response.page);
        setDashboard(null);
        setPendingManageOnboarding({
          pageSlug: nextSession.pageSlug,
          createdAt: Date.now(),
        });
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, nextSession);
        await refreshDashboard({
          session: nextSession,
          baseUrl: apiBaseUrl,
        });
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : '청첩장 초안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        );
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [apiBaseUrl, refreshDashboard]
  );

  const logout = useCallback(async () => {
    setAuthError(null);
    await clearSession();
  }, [clearSession]);

  const saveCurrentPageConfig = useCallback(
    async (
      config: MobileInvitationSeed,
      options: {
        published?: boolean;
        defaultTheme?: MobileInvitationThemeKey;
      } = {}
    ) => {
      if (!session) {
        setAuthError('로그인 후 저장할 수 있습니다.');
        return false;
      }

      setDashboardLoading(true);

      try {
        await saveMobileInvitationPageConfig(apiBaseUrl, session.pageSlug, session.token, {
          config,
          published: options.published ?? dashboard?.page.published,
          defaultTheme: options.defaultTheme ?? dashboard?.page.defaultTheme,
        });
        setAuthError(null);
        await refreshDashboard();
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error ? error.message : '청첩장 저장에 실패했습니다.'
        );
        return false;
      } finally {
        setDashboardLoading(false);
      }
    },
    [apiBaseUrl, dashboard?.page.defaultTheme, dashboard?.page.published, refreshDashboard, session]
  );

  const setPublishedState = useCallback(
    async (published: boolean) => {
      if (!session || !dashboard) {
        setAuthError('로그인 후 공개 상태를 변경할 수 있습니다.');
        return false;
      }

      setDashboardLoading(true);

      try {
        await setMobileInvitationPublishedState(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          published,
          dashboard.page.defaultTheme
        );
        setAuthError(null);
        await refreshDashboard();
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error ? error.message : '공개 상태를 변경하지 못했습니다.'
        );
        return false;
      } finally {
        setDashboardLoading(false);
      }
    },
    [apiBaseUrl, dashboard, refreshDashboard, session]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!session) {
        setAuthError('로그인 후 댓글을 관리할 수 있습니다.');
        return false;
      }

      try {
        await deleteMobileInvitationComment(
          apiBaseUrl,
          session.pageSlug,
          commentId,
          session.token
        );
        setAuthError(null);
        await refreshDashboard();
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error ? error.message : '댓글을 삭제하지 못했습니다.'
        );
        return false;
      }
    },
    [apiBaseUrl, refreshDashboard, session]
  );

  const saveDraft = useCallback(
    async (input: CreateDraftInput) => {
      const nextDraft: CreateDraftItem = {
        ...input,
        id: `draft-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'draft',
      };

      const nextDrafts = [nextDraft, ...drafts].slice(0, 12);
      setDrafts(nextDrafts);
      await setStoredJson(DRAFT_STORAGE_KEY, nextDrafts);
    },
    [drafts]
  );

  const removeDraft = useCallback(
    async (draftId: string) => {
      const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
      setDrafts(nextDrafts);
      await setStoredJson(DRAFT_STORAGE_KEY, nextDrafts);
    },
    [drafts]
  );

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const clearPendingManageOnboarding = useCallback(() => {
    setPendingManageOnboarding(null);
  }, []);

  const value = useMemo<AppStateContextValue>(
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
      isAuthenticated: Boolean(session),
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
      refreshDashboard: async () => {
        await refreshDashboard();
      },
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
      clearPendingManageOnboarding,
      dashboard,
      dashboardLoading,
      drafts,
      fontScale,
      fontScalePreference,
      isAuthenticating,
      isBootstrapping,
      createInvitationPage,
      login,
      logout,
      pendingManageOnboarding,
      pageSummary,
      palette,
      refreshDashboard,
      saveCurrentPageConfig,
      saveDraft,
      session,
      setApiBaseUrl,
      setFontScalePreference,
      setPublishedState,
      setThemePreference,
      themePreference,
      deleteComment,
      removeDraft,
      clearAuthError,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider.');
  }

  return context;
}
