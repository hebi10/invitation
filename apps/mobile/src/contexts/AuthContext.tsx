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
  loginMobileCustomerAuth,
  refreshMobileCustomerAuth,
  validateMobileClientEditorSession,
  verifyMobileClientEditorHighRiskSession,
  type MobileBillingPurchaseReceiptInput,
} from '../lib/api';
import { HighRiskActionModal } from '../components/manage/HighRiskActionModal';
import {
  buildLinkedInvitationCardFromPageSummary,
  upsertLinkedInvitationCard,
} from '../lib/linkedInvitationCards';
import { getStoredJson, setStoredJson, setStoredString } from '../lib/storage';
import type { MobileClientEditorPermissions } from '../../../../src/types/mobileClientEditor';
import type {
  MobileEditableInvitationPageConfig,
  MobileCustomerAuthSession,
  MobileHighRiskSessionSummary,
  MobileInvitationCreationInput,
  MobileInvitationLinks,
  MobilePageSummary,
  MobileSessionSummary,
  PendingManageOnboarding,
} from '../types/mobileInvitation';

import { usePreferences } from './PreferencesContext';

const SESSION_STORAGE_KEY = 'mobile-invitation:session';
const CUSTOMER_AUTH_STORAGE_KEY = 'mobile-invitation:customer-auth-session';
const SESSION_EXPIRY_BUFFER_MS = 30 * 1000;
const CUSTOMER_AUTH_EXPIRY_BUFFER_MS = 60 * 1000;

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
  execute: () => Promise<boolean>;
  resolve: (value: boolean) => void;
};

type AuthContextValue = {
  session: MobileSessionSummary | null;
  highRiskSession: MobileHighRiskSessionSummary | null;
  customerSession: MobileCustomerAuthSession | null;
  getHighRiskToken: (pageSlug?: string | null) => string | null;
  isAuthenticated: boolean;
  isCustomerAuthenticated: boolean;
  isAuthenticating: boolean;
  isCustomerAuthenticating: boolean;
  isReady: boolean;
  authError: string | null;
  customerAuthError: string | null;
  pendingManageOnboarding: PendingManageOnboarding | null;
  initialDashboardSeed: AuthInitialDashboardSeed | null;
  loginCustomer: (email: string, password: string) => Promise<boolean>;
  logoutCustomer: () => Promise<void>;
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
  const [customerSession, setCustomerSession] =
    useState<MobileCustomerAuthSession | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCustomerAuthenticating, setIsCustomerAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [customerAuthError, setCustomerAuthError] = useState<string | null>(null);
  const [pendingManageOnboarding, setPendingManageOnboarding] =
    useState<PendingManageOnboarding | null>(null);
  const [initialDashboardSeed, setInitialDashboardSeed] =
    useState<AuthInitialDashboardSeed | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingHighRiskAction, setPendingHighRiskAction] =
    useState<PendingHighRiskAction | null>(null);
  const [highRiskError, setHighRiskError] = useState<string | null>(null);
  const [highRiskLoading, setHighRiskLoading] = useState(false);

  const hasRestoredSessionRef = useRef(false);
  const lastApiBaseUrlRef = useRef<string | null>(null);
  const highRiskSessionRef = useRef<MobileHighRiskSessionSummary | null>(null);
  const customerSessionRef = useRef<MobileCustomerAuthSession | null>(null);

  const updateHighRiskSession = useCallback(
    (nextSession: MobileHighRiskSessionSummary | null) => {
      highRiskSessionRef.current = nextSession;
      setHighRiskSession(nextSession);
    },
    []
  );

  const updateCustomerSession = useCallback(
    (nextSession: MobileCustomerAuthSession | null) => {
      customerSessionRef.current = nextSession;
      setCustomerSession(nextSession);
    },
    []
  );

  const clearSession = useCallback(async () => {
    setSession(null);
    updateHighRiskSession(null);
    setPendingManageOnboarding(null);
    setInitialDashboardSeed(null);
    setPendingHighRiskAction(null);
    setHighRiskError(null);
    setHighRiskLoading(false);
    await setStoredString(SESSION_STORAGE_KEY, null, { sensitive: true });
  }, [updateHighRiskSession]);

  const clearCustomerSession = useCallback(async () => {
    updateCustomerSession(null);
    setCustomerAuthError(null);
    await setStoredString(CUSTOMER_AUTH_STORAGE_KEY, null, { sensitive: true });
  }, [updateCustomerSession]);

  const hasSessionExpired = useCallback((candidateSession: MobileSessionSummary) => {
    return candidateSession.expiresAt <= Date.now() + SESSION_EXPIRY_BUFFER_MS;
  }, []);

  const hasCustomerSessionExpired = useCallback(
    (candidateSession: MobileCustomerAuthSession) => {
      return candidateSession.expiresAt <= Date.now() + CUSTOMER_AUTH_EXPIRY_BUFFER_MS;
    },
    []
  );

  const hasHighRiskSessionExpired = useCallback(
    (candidateSession: MobileHighRiskSessionSummary) => {
      return candidateSession.expiresAt <= Date.now() + SESSION_EXPIRY_BUFFER_MS;
    },
    []
  );

  const verifyHighRiskAccess = useCallback(
    async () => {
      if (!session) {
        return {
          verified: false,
          error: '청첩장을 연동한 뒤 다시 시도해 주세요.',
        } as const;
      }

      try {
        const response = await verifyMobileClientEditorHighRiskSession(
          apiBaseUrl,
          session.pageSlug,
          session.token
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
    [clearSession, hasSessionExpired, updateHighRiskSession]
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
          '저장된 연동 정보가 만료되었습니다. 다시 로그인하거나 앱 연동 링크를 새로 발급해 주세요.',
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

  const applyCustomerAuthSession = useCallback(
    async (nextSession: MobileCustomerAuthSession) => {
      updateCustomerSession(nextSession);
      setCustomerAuthError(null);
      await setStoredJson(CUSTOMER_AUTH_STORAGE_KEY, nextSession, {
        sensitive: true,
      });
    },
    [updateCustomerSession]
  );

  const refreshCustomerSession = useCallback(
    async (candidateSession: MobileCustomerAuthSession) => {
      if (!candidateSession.refreshToken.trim()) {
        await clearCustomerSession();
        return null;
      }

      if (!hasCustomerSessionExpired(candidateSession)) {
        updateCustomerSession(candidateSession);
        return candidateSession;
      }

      setIsCustomerAuthenticating(true);

      try {
        const response = await refreshMobileCustomerAuth(
          apiBaseUrl,
          candidateSession.refreshToken
        );
        const nextSession = {
          ...response.session,
          email: response.session.email || candidateSession.email,
          displayName: response.session.displayName ?? candidateSession.displayName,
        };
        await applyCustomerAuthSession(nextSession);
        return nextSession;
      } catch (error) {
        await clearCustomerSession();
        setCustomerAuthError(
          error instanceof Error
            ? error.message
            : '고객 로그인 정보가 만료되었습니다. 다시 로그인해 주세요.'
        );
        return null;
      } finally {
        setIsCustomerAuthenticating(false);
      }
    },
    [
      apiBaseUrl,
      applyCustomerAuthSession,
      clearCustomerSession,
      hasCustomerSessionExpired,
      updateCustomerSession,
    ]
  );

  const getCustomerIdToken = useCallback(async () => {
    const currentCustomerSession = customerSessionRef.current;
    if (!currentCustomerSession) {
      return null;
    }

    const refreshedSession = await refreshCustomerSession(currentCustomerSession);
    return refreshedSession?.idToken ?? null;
  }, [refreshCustomerSession]);

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
      const storedCustomerSession = await getStoredJson<MobileCustomerAuthSession | null>(
        CUSTOMER_AUTH_STORAGE_KEY,
        null,
        { sensitive: true }
      );

      if (!mounted) {
        return;
      }

      if (storedSession) {
        await restoreSession(storedSession, apiBaseUrl);
      }

      if (storedCustomerSession) {
        await refreshCustomerSession(storedCustomerSession);
      }

      if (mounted) {
        setIsReady(true);
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
  }, [apiBaseUrl, isPreferencesReady, refreshCustomerSession, restoreSession]);

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

    if (customerSessionRef.current) {
      void clearCustomerSession();
    }
  }, [apiBaseUrl, clearCustomerSession, clearSession, isReady, session]);

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

  const loginCustomer = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim();
      const normalizedPassword = password.trim();

      if (!normalizedEmail || !normalizedPassword) {
        setCustomerAuthError('이메일과 비밀번호를 입력해 주세요.');
        return false;
      }

      setIsCustomerAuthenticating(true);

      try {
        const response = await loginMobileCustomerAuth(
          apiBaseUrl,
          normalizedEmail,
          normalizedPassword
        );
        await applyCustomerAuthSession(response.session);
        return true;
      } catch (error) {
        setCustomerAuthError(
          error instanceof Error
            ? error.message
            : '고객 로그인에 실패했습니다. 다시 시도해 주세요.'
        );
        return false;
      } finally {
        setIsCustomerAuthenticating(false);
      }
    },
    [apiBaseUrl, applyCustomerAuthSession]
  );

  const logoutCustomer = useCallback(async () => {
    await clearCustomerSession();
  }, [clearCustomerSession]);

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
        const customerIdToken = await getCustomerIdToken();
        if (!customerIdToken) {
          throw new Error('Customer authentication is required.');
        }

        const response = options.billingPurchase
          ? await fulfillMobileBillingPageCreation(apiBaseUrl, {
              purchase: options.billingPurchase,
              input,
              customerIdToken,
            })
          : await createMobileInvitationDraft(apiBaseUrl, input, customerIdToken);
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
    [apiBaseUrl, applyAuthenticatedSession, getCustomerIdToken]
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
        setHighRiskError(null);
        setHighRiskLoading(false);
        setPendingHighRiskAction({
          ...options,
          execute,
          resolve,
        });
      });
    },
    [session]
  );

  const handleConfirmHighRiskAction = useCallback(async () => {
    if (!pendingHighRiskAction) {
      return;
    }

    setHighRiskLoading(true);
    setHighRiskError(null);
    let activeHighRiskToken = getHighRiskToken(session?.pageSlug);

    if (!activeHighRiskToken) {
      const verification = await verifyHighRiskAccess();
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
      setHighRiskError(null);
    } catch (error) {
      setHighRiskError(
        error instanceof Error
          ? error.message
          : '민감한 작업을 진행하지 못했습니다. 다시 시도해 주세요.'
      );
      pendingHighRiskAction.resolve(false);
      setPendingHighRiskAction(null);
    } finally {
      setHighRiskLoading(false);
    }
  }, [getHighRiskToken, pendingHighRiskAction, session?.pageSlug, verifyHighRiskAccess]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      highRiskSession,
      customerSession,
      getHighRiskToken,
      isAuthenticated: Boolean(session),
      isCustomerAuthenticated: Boolean(customerSession),
      isAuthenticating,
      isCustomerAuthenticating,
      isReady,
      authError,
      customerAuthError,
      pendingManageOnboarding,
      initialDashboardSeed,
      loginCustomer,
      logoutCustomer,
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
      customerAuthError,
      customerSession,
      getHighRiskToken,
      highRiskSession,
      initialDashboardSeed,
      isAuthenticating,
      isCustomerAuthenticating,
      isReady,
      loginCustomer,
      loginWithLinkToken,
      logout,
      logoutCustomer,
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
          '민감한 작업이라 로그인 세션을 다시 확인한 뒤 진행합니다.'
        }
        confirmLabel={pendingHighRiskAction?.confirmLabel ?? '확인 후 진행'}
        errorMessage={highRiskError}
        loading={highRiskLoading}
        palette={palette}
        fontScale={fontScale}
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
