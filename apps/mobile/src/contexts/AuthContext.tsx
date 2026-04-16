import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createMobileInvitationDraft,
  loginMobileClientEditor,
  validateMobileClientEditorSession,
} from '../lib/api';
import {
  buildLinkedInvitationCardFromPageSummary,
  upsertLinkedInvitationCard,
} from '../lib/linkedInvitationCards';
import { extractPageSlugFromIdentifier } from '../lib/pageSlug';
import { getStoredJson, setStoredJson, setStoredString } from '../lib/storage';
import type {
  MobileEditableInvitationPageConfig,
  MobileInvitationCreationInput,
  MobileInvitationLinks,
  MobilePageSummary,
  MobileSessionSummary,
  PendingManageOnboarding,
} from '../types/mobileInvitation';

import { usePreferences } from './PreferencesContext';

const SESSION_STORAGE_KEY = 'mobile-invitation:session';

export type AuthInitialDashboardSeed = {
  dashboardPage: MobileEditableInvitationPageConfig | null | undefined;
  links: MobileInvitationLinks | null | undefined;
  pageFallback: MobilePageSummary | null;
  ticketCount: number;
};

type AuthContextValue = {
  session: MobileSessionSummary | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isReady: boolean;
  authError: string | null;
  pendingManageOnboarding: PendingManageOnboarding | null;
  initialDashboardSeed: AuthInitialDashboardSeed | null;
  login: (pageIdentifier: string, password: string) => Promise<boolean>;
  createInvitationPage: (
    input: MobileInvitationCreationInput
  ) => Promise<boolean>;
  activateStoredSession: (candidateSession: MobileSessionSummary) => Promise<boolean>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  clearPendingManageOnboarding: () => void;
  consumeInitialDashboardSeed: () => void;
  reportAuthError: (message: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { apiBaseUrl, isReady: isPreferencesReady } = usePreferences();

  const [session, setSession] = useState<MobileSessionSummary | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingManageOnboarding, setPendingManageOnboarding] =
    useState<PendingManageOnboarding | null>(null);
  const [initialDashboardSeed, setInitialDashboardSeed] =
    useState<AuthInitialDashboardSeed | null>(null);
  const [isReady, setIsReady] = useState(false);

  const hasRestoredSessionRef = useRef(false);
  const lastApiBaseUrlRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    setSession(null);
    setPendingManageOnboarding(null);
    setInitialDashboardSeed(null);
    await setStoredString(SESSION_STORAGE_KEY, null);
  }, []);

  const hydrateSession = useCallback(
    async (
      candidateSession: MobileSessionSummary,
      nextBaseUrl: string,
      options: {
        clearOnFailure: boolean;
        failureMessage?: string;
      }
    ) => {
      setIsAuthenticating(true);

      try {
        const response = await validateMobileClientEditorSession(
          nextBaseUrl,
          candidateSession.pageSlug,
          candidateSession.token
        );

        if (!response.authenticated) {
          if (options.clearOnFailure) {
            await clearSession();
          } else if (options.failureMessage) {
            setAuthError(options.failureMessage);
          }
          return false;
        }

        setSession(candidateSession);
        setInitialDashboardSeed({
          dashboardPage: response.dashboardPage,
          links: response.links,
          pageFallback: response.page ?? null,
          ticketCount: response.page?.ticketCount ?? 0,
        });
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, candidateSession);

        if (response.page) {
          await upsertLinkedInvitationCard(
            buildLinkedInvitationCardFromPageSummary(response.page, {
              publicUrl: response.links?.publicUrl ?? null,
              links: response.links,
              config: response.dashboardPage?.config,
              updatedAt: Date.now(),
              ticketCount: response.page.ticketCount,
              session: candidateSession,
            })
          );
        }
        return true;
      } catch {
        if (options.clearOnFailure) {
          await clearSession();
        } else if (options.failureMessage) {
          setAuthError(options.failureMessage);
        }
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [clearSession]
  );

  const restoreSession = useCallback(
    async (candidateSession: MobileSessionSummary, nextBaseUrl: string) =>
      hydrateSession(candidateSession, nextBaseUrl, {
        clearOnFailure: true,
      }),
    [hydrateSession]
  );

  const activateStoredSession = useCallback(
    async (candidateSession: MobileSessionSummary) =>
      hydrateSession(candidateSession, apiBaseUrl, {
        clearOnFailure: false,
        failureMessage:
          '저장된 청첩장 연동 정보가 만료되었습니다. 비밀번호를 다시 입력해 주세요.',
      }),
    [apiBaseUrl, hydrateSession]
  );

  useEffect(() => {
    if (!isPreferencesReady) {
      return;
    }

    if (hasRestoredSessionRef.current) {
      return;
    }

    hasRestoredSessionRef.current = true;
    let mounted = true;

    const restore = async () => {
      const storedSession = await getStoredJson<MobileSessionSummary | null>(
        SESSION_STORAGE_KEY,
        null
      );

      if (!mounted) {
        return;
      }

      if (storedSession) {
        await restoreSession(storedSession, apiBaseUrl);
      }

      if (mounted) {
        setIsReady(true);
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, [apiBaseUrl, isPreferencesReady, restoreSession]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (lastApiBaseUrlRef.current === null) {
      lastApiBaseUrlRef.current = apiBaseUrl;
      return;
    }

    if (lastApiBaseUrlRef.current === apiBaseUrl) {
      return;
    }

    lastApiBaseUrlRef.current = apiBaseUrl;

    if (session) {
      void clearSession();
    }
  }, [apiBaseUrl, clearSession, isReady, session]);

  const login = useCallback(
    async (pageIdentifier: string, password: string) => {
      const pageSlug = extractPageSlugFromIdentifier(pageIdentifier);
      const normalizedPassword = password.trim();

      if (!pageSlug || !normalizedPassword) {
        setAuthError('청첩장 슬러그와 비밀번호를 입력해 주세요.');
        return false;
      }

      setIsAuthenticating(true);

      try {
        const response = await loginMobileClientEditor(
          apiBaseUrl,
          pageSlug,
          normalizedPassword
        );

        setSession(response.session);
        setInitialDashboardSeed({
          dashboardPage: response.dashboardPage,
          links: response.links,
          pageFallback: response.page ?? null,
          ticketCount: response.page?.ticketCount ?? 0,
        });
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, response.session);

        if (response.page) {
          await upsertLinkedInvitationCard(
            buildLinkedInvitationCardFromPageSummary(response.page, {
              publicUrl: response.links?.publicUrl ?? null,
              links: response.links,
              config: response.dashboardPage?.config,
              updatedAt: Date.now(),
              ticketCount: response.page.ticketCount,
              session: response.session,
            })
          );
        }
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : '청첩장 연동에 실패했습니다. 다시 시도해 주세요.'
        );
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [apiBaseUrl]
  );

  const createInvitationPage = useCallback(
    async (input: MobileInvitationCreationInput) => {
      setIsAuthenticating(true);

      try {
        const response = await createMobileInvitationDraft(apiBaseUrl, input);

        setSession(response.session);
        setInitialDashboardSeed({
          dashboardPage: response.dashboardPage,
          links: response.links,
          pageFallback: response.page ?? null,
          ticketCount: response.page?.ticketCount ?? 0,
        });
        setPendingManageOnboarding({
          pageSlug: response.session.pageSlug,
          createdAt: Date.now(),
        });
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, response.session);

        if (response.page) {
          await upsertLinkedInvitationCard(
            buildLinkedInvitationCardFromPageSummary(response.page, {
              publicUrl: response.links?.publicUrl ?? null,
              links: response.links,
              config: response.dashboardPage?.config,
              updatedAt: Date.now(),
              ticketCount: response.page.ticketCount,
              session: response.session,
            })
          );
        }
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : '청첩장 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        );
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [apiBaseUrl]
  );

  const logout = useCallback(async () => {
    setAuthError(null);
    await clearSession();
  }, [clearSession]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const clearPendingManageOnboarding = useCallback(() => {
    setPendingManageOnboarding(null);
  }, []);

  const consumeInitialDashboardSeed = useCallback(() => {
    setInitialDashboardSeed(null);
  }, []);

  const reportAuthError = useCallback((message: string) => {
    setAuthError(message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isAuthenticating,
      isReady,
      authError,
      pendingManageOnboarding,
      initialDashboardSeed,
      login,
      createInvitationPage,
      activateStoredSession,
      logout,
      clearAuthError,
      clearPendingManageOnboarding,
      consumeInitialDashboardSeed,
      reportAuthError,
    }),
    [
      authError,
      clearAuthError,
      clearPendingManageOnboarding,
      consumeInitialDashboardSeed,
      createInvitationPage,
      activateStoredSession,
      initialDashboardSeed,
      isAuthenticating,
      isReady,
      login,
      logout,
      pendingManageOnboarding,
      reportAuthError,
      session,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
