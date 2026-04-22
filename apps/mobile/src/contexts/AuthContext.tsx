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
  exchangeMobileClientEditorLinkToken,
  fulfillMobileBillingPageCreation,
  loginMobileClientEditor,
  validateMobileClientEditorSession,
  verifyMobileClientEditorHighRiskSession,
  type MobileBillingPurchaseReceiptInput,
} from '../lib/api';
import { HighRiskActionModal } from '../components/manage/HighRiskActionModal';
import {
  buildLinkedInvitationCardFromPageSummary,
  upsertLinkedInvitationCard,
} from '../lib/linkedInvitationCards';
import { extractPageSlugFromIdentifier } from '../lib/pageSlug';
import { getStoredJson, setStoredJson, setStoredString } from '../lib/storage';
import type { MobileClientEditorPermissions } from '../../../../src/types/mobileClientEditor';
import type {
  MobileEditableInvitationPageConfig,
  MobileHighRiskSessionSummary,
  MobileInvitationCreationInput,
  MobileInvitationLinks,
  MobilePageSummary,
  MobileSessionSummary,
  PendingManageOnboarding,
} from '../types/mobileInvitation';

import { usePreferences } from './PreferencesContext';

const SESSION_STORAGE_KEY = 'mobile-invitation:session';
const SESSION_EXPIRY_BUFFER_MS = 30 * 1000;

export type AuthInitialDashboardSeed = {
  dashboardPage: MobileEditableInvitationPageConfig | null | undefined;
  links: MobileInvitationLinks | null | undefined;
  pageFallback: MobilePageSummary | null;
  ticketCount: number;
  permissions: MobileClientEditorPermissions | null | undefined;
};

type HighRiskActionOptions = {
  title: string;
  description: string;
  confirmLabel: string;
};

type PendingHighRiskAction = HighRiskActionOptions & {
  requiresPassword: boolean;
  execute: () => Promise<boolean>;
  resolve: (value: boolean) => void;
};

type AuthContextValue = {
  session: MobileSessionSummary | null;
  highRiskSession: MobileHighRiskSessionSummary | null;
  getHighRiskToken: (pageSlug?: string | null) => string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isReady: boolean;
  authError: string | null;
  pendingManageOnboarding: PendingManageOnboarding | null;
  initialDashboardSeed: AuthInitialDashboardSeed | null;
  login: (pageIdentifier: string, password: string) => Promise<boolean>;
  loginWithLinkToken: (linkToken: string) => Promise<boolean>;
  createInvitationPage: (
    input: MobileInvitationCreationInput,
    options?: {
      billingPurchase?: MobileBillingPurchaseReceiptInput;
    }
  ) => Promise<boolean>;
  activateStoredSession: (candidateSession: MobileSessionSummary) => Promise<boolean>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  clearPendingManageOnboarding: () => void;
  consumeInitialDashboardSeed: () => void;
  reportAuthError: (message: string) => void;
  runHighRiskAction: (
    options: HighRiskActionOptions,
    execute: () => Promise<boolean>
  ) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const {
    apiBaseUrl,
    fontScale,
    isReady: isPreferencesReady,
    palette,
  } = usePreferences();

  const [session, setSession] = useState<MobileSessionSummary | null>(null);
  const [highRiskSession, setHighRiskSession] =
    useState<MobileHighRiskSessionSummary | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingManageOnboarding, setPendingManageOnboarding] =
    useState<PendingManageOnboarding | null>(null);
  const [initialDashboardSeed, setInitialDashboardSeed] =
    useState<AuthInitialDashboardSeed | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingHighRiskAction, setPendingHighRiskAction] =
    useState<PendingHighRiskAction | null>(null);
  const [highRiskPassword, setHighRiskPassword] = useState('');
  const [highRiskError, setHighRiskError] = useState<string | null>(null);
  const [highRiskLoading, setHighRiskLoading] = useState(false);

  const hasRestoredSessionRef = useRef(false);
  const lastApiBaseUrlRef = useRef<string | null>(null);
  const highRiskSessionRef = useRef<MobileHighRiskSessionSummary | null>(null);

  const updateHighRiskSession = useCallback(
    (nextSession: MobileHighRiskSessionSummary | null) => {
      highRiskSessionRef.current = nextSession;
      setHighRiskSession(nextSession);
    },
    []
  );

  const clearSession = useCallback(async () => {
    setSession(null);
    updateHighRiskSession(null);
    setPendingManageOnboarding(null);
    setInitialDashboardSeed(null);
    setPendingHighRiskAction(null);
    setHighRiskPassword('');
    setHighRiskError(null);
    setHighRiskLoading(false);
    await setStoredString(SESSION_STORAGE_KEY, null, { sensitive: true });
  }, [updateHighRiskSession]);

  const hasSessionExpired = useCallback((candidateSession: MobileSessionSummary) => {
    return candidateSession.expiresAt <= Date.now() + SESSION_EXPIRY_BUFFER_MS;
  }, []);

  const hasHighRiskSessionExpired = useCallback(
    (candidateSession: MobileHighRiskSessionSummary) => {
      return candidateSession.expiresAt <= Date.now() + SESSION_EXPIRY_BUFFER_MS;
    },
    []
  );

  const hasRecentHighRiskAccess = useCallback(
    (targetPageSlug: string | null | undefined) => {
      const normalizedPageSlug = targetPageSlug?.trim() ?? '';
      const currentHighRiskSession = highRiskSessionRef.current;
      if (!normalizedPageSlug || !currentHighRiskSession) {
        return false;
      }

      if (currentHighRiskSession.pageSlug !== normalizedPageSlug) {
        return false;
      }

      return !hasHighRiskSessionExpired(currentHighRiskSession);
    },
    [hasHighRiskSessionExpired]
  );

  const verifyHighRiskAccess = useCallback(
    async (password: string) => {
      if (!session) {
        return {
          verified: false,
          error: '청첩장을 연동한 뒤 다시 시도해 주세요.',
        } as const;
      }

      const normalizedPassword = password.trim();
      if (!normalizedPassword) {
        return {
          verified: false,
          error: '연동 비밀번호를 입력해 주세요.',
        } as const;
      }

      try {
        const response = await verifyMobileClientEditorHighRiskSession(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          normalizedPassword
        );

        updateHighRiskSession(response.session);
        return {
          verified: true,
          session: response.session,
          error: null,
        } as const;
      } catch (error) {
        return {
          verified: false,
          session: null,
          error:
            error instanceof Error
              ? error.message
              : '재인증을 확인하지 못했습니다. 다시 시도해 주세요.',
        } as const;
      }
    },
    [apiBaseUrl, session, updateHighRiskSession]
  );

  const getHighRiskToken = useCallback(
    (pageSlug?: string | null) => {
      const currentHighRiskSession = highRiskSessionRef.current;
      const normalizedPageSlug = pageSlug?.trim() ?? session?.pageSlug ?? '';

      if (!currentHighRiskSession || !normalizedPageSlug) {
        return null;
      }

      if (currentHighRiskSession.pageSlug !== normalizedPageSlug) {
        return null;
      }

      if (hasHighRiskSessionExpired(currentHighRiskSession)) {
        updateHighRiskSession(null);
        return null;
      }

      return currentHighRiskSession.token;
    },
    [hasHighRiskSessionExpired, session?.pageSlug, updateHighRiskSession]
  );

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
        if (hasSessionExpired(candidateSession)) {
          if (options.clearOnFailure) {
            await clearSession();
          } else if (options.failureMessage) {
            setAuthError(options.failureMessage);
          }
          return false;
        }

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
        updateHighRiskSession(null);
        setInitialDashboardSeed({
          dashboardPage: response.dashboardPage,
          links: response.links,
          pageFallback: response.page ?? null,
          ticketCount: response.page?.ticketCount ?? 0,
          permissions: response.permissions,
        });
        setAuthError(null);
        await setStoredJson(SESSION_STORAGE_KEY, candidateSession, {
          sensitive: true,
        });

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
    [clearSession, hasSessionExpired]
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
          '저장된 연동 정보가 만료되었습니다. 비밀번호를 다시 입력해 주세요.',
      }),
    [apiBaseUrl, hydrateSession]
  );

  const applyAuthenticatedSession = useCallback(
    async (
      response: {
        session: MobileSessionSummary;
        dashboardPage?: MobileEditableInvitationPageConfig | null;
        links: MobileInvitationLinks;
        page: MobilePageSummary | null;
        permissions: MobileClientEditorPermissions;
      },
      options: {
        pendingManageOnboarding?: PendingManageOnboarding | null;
      } = {}
    ) => {
      setSession(response.session);
      updateHighRiskSession(null);
      setInitialDashboardSeed({
        dashboardPage: response.dashboardPage,
        links: response.links,
        pageFallback: response.page ?? null,
        ticketCount: response.page?.ticketCount ?? 0,
        permissions: response.permissions,
      });
      setPendingManageOnboarding(options.pendingManageOnboarding ?? null);
      setAuthError(null);
      await setStoredJson(SESSION_STORAGE_KEY, response.session, {
        sensitive: true,
      });

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
    },
    [updateHighRiskSession]
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
        null,
        { sensitive: true }
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

  useEffect(() => {
    if (!session || !highRiskSession) {
      return;
    }

    if (
      highRiskSession.pageSlug !== session.pageSlug ||
      hasHighRiskSessionExpired(highRiskSession)
    ) {
      updateHighRiskSession(null);
    }
  }, [hasHighRiskSessionExpired, highRiskSession, session, updateHighRiskSession]);

  const login = useCallback(
    async (pageIdentifier: string, password: string) => {
      const pageSlug = extractPageSlugFromIdentifier(pageIdentifier);
      const normalizedPassword = password.trim();

      if (!pageSlug || !normalizedPassword) {
        setAuthError('청첩장 링크 또는 주소와 비밀번호를 입력해 주세요.');
        return false;
      }

      setIsAuthenticating(true);

      try {
        const response = await loginMobileClientEditor(
          apiBaseUrl,
          pageSlug,
          normalizedPassword
        );
        await applyAuthenticatedSession(response);
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
    [apiBaseUrl, applyAuthenticatedSession]
  );

  const loginWithLinkToken = useCallback(
    async (linkToken: string) => {
      const normalizedLinkToken = linkToken.trim();
      if (!normalizedLinkToken) {
        setAuthError('앱 연동 링크 정보를 다시 확인해 주세요.');
        return false;
      }

      setIsAuthenticating(true);

      try {
        const response = await exchangeMobileClientEditorLinkToken(
          apiBaseUrl,
          normalizedLinkToken
        );
        await applyAuthenticatedSession(response);
        return true;
      } catch (error) {
        setAuthError(
          error instanceof Error
            ? error.message
            : '앱 연동 링크를 확인하지 못했습니다. 다시 시도해 주세요.'
        );
        return false;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [apiBaseUrl, applyAuthenticatedSession]
  );

  const createInvitationPage = useCallback(
    async (
      input: MobileInvitationCreationInput,
      options: {
        billingPurchase?: MobileBillingPurchaseReceiptInput;
      } = {}
    ) => {
      setIsAuthenticating(true);

      try {
        const response = options.billingPurchase
          ? await fulfillMobileBillingPageCreation(apiBaseUrl, {
              purchase: options.billingPurchase,
              input,
            })
          : await createMobileInvitationDraft(apiBaseUrl, input);
        await applyAuthenticatedSession(response, {
          pendingManageOnboarding: {
            pageSlug: response.session.pageSlug,
            createdAt: Date.now(),
          },
        });
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
    [apiBaseUrl, applyAuthenticatedSession]
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

  const closePendingHighRiskAction = useCallback(() => {
    setPendingHighRiskAction((current) => {
      current?.resolve(false);
      return null;
    });
    setHighRiskPassword('');
    setHighRiskError(null);
    setHighRiskLoading(false);
  }, []);

  const runHighRiskAction = useCallback(
    (options: HighRiskActionOptions, execute: () => Promise<boolean>) => {
      if (!session) {
        setAuthError('청첩장을 연동한 뒤 다시 시도해 주세요.');
        return Promise.resolve(false);
      }

      return new Promise<boolean>((resolve) => {
        setHighRiskPassword('');
        setHighRiskError(null);
        setHighRiskLoading(false);
        setPendingHighRiskAction({
          ...options,
          requiresPassword: !hasRecentHighRiskAccess(session.pageSlug),
          execute,
          resolve,
        });
      });
    },
    [hasRecentHighRiskAccess, session]
  );

  const handleConfirmHighRiskAction = useCallback(async () => {
    if (!pendingHighRiskAction) {
      return;
    }

    setHighRiskLoading(true);
    setHighRiskError(null);
    let activeHighRiskToken = getHighRiskToken(session?.pageSlug);

    if (pendingHighRiskAction.requiresPassword) {
      const verification = await verifyHighRiskAccess(highRiskPassword);
      if (!verification.verified) {
        setHighRiskError(verification.error);
        setHighRiskLoading(false);
        return;
      }

      activeHighRiskToken = verification.session?.token ?? null;
    }

    if (!activeHighRiskToken) {
      setHighRiskError('재인증 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
      setHighRiskLoading(false);
      return;
    }

    try {
      const completed = await pendingHighRiskAction.execute();
      pendingHighRiskAction.resolve(completed);
      setPendingHighRiskAction(null);
      setHighRiskPassword('');
      setHighRiskError(null);
    } catch (error) {
      setHighRiskError(
        error instanceof Error
          ? error.message
          : '민감한 작업을 진행하지 못했습니다. 다시 시도해 주세요.'
      );
      pendingHighRiskAction.resolve(false);
      setPendingHighRiskAction(null);
      setHighRiskPassword('');
    } finally {
      setHighRiskLoading(false);
    }
  }, [getHighRiskToken, highRiskPassword, pendingHighRiskAction, session?.pageSlug, verifyHighRiskAccess]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      highRiskSession,
      getHighRiskToken,
      isAuthenticated: Boolean(session),
      isAuthenticating,
      isReady,
      authError,
      pendingManageOnboarding,
      initialDashboardSeed,
      login,
      loginWithLinkToken,
      createInvitationPage,
      activateStoredSession,
      logout,
      clearAuthError,
      clearPendingManageOnboarding,
      consumeInitialDashboardSeed,
      reportAuthError,
      runHighRiskAction,
    }),
    [
      authError,
      clearAuthError,
      clearPendingManageOnboarding,
      consumeInitialDashboardSeed,
      createInvitationPage,
      activateStoredSession,
      getHighRiskToken,
      highRiskSession,
      initialDashboardSeed,
      isAuthenticating,
      isReady,
      login,
      loginWithLinkToken,
      logout,
      pendingManageOnboarding,
      reportAuthError,
      runHighRiskAction,
      session,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <HighRiskActionModal
        visible={Boolean(pendingHighRiskAction)}
        title={pendingHighRiskAction?.title ?? '민감한 작업 확인'}
        description={
          pendingHighRiskAction?.description ??
          '민감한 작업이라 비밀번호를 다시 확인한 뒤 진행합니다.'
        }
        confirmLabel={pendingHighRiskAction?.confirmLabel ?? '확인 후 진행'}
        requiresPassword={pendingHighRiskAction?.requiresPassword ?? true}
        password={highRiskPassword}
        errorMessage={highRiskError}
        loading={highRiskLoading}
        palette={palette}
        fontScale={fontScale}
        onChangePassword={setHighRiskPassword}
        onConfirm={() => void handleConfirmHighRiskAction()}
        onClose={closePendingHighRiskAction}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
