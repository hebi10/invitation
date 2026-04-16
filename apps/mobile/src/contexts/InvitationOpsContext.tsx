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
  deleteMobileInvitationComment,
  fetchMobileInvitationDashboard,
  saveMobileInvitationPageConfig,
  setMobileInvitationPublishedState,
} from '../lib/api';
import type {
  MobileEditableInvitationPageConfig,
  MobileInvitationDashboard,
  MobileInvitationLinks,
  MobileInvitationSeed,
  MobileInvitationThemeKey,
  MobilePageSummary,
} from '../types/mobileInvitation';

import { useAuth } from './AuthContext';
import { usePreferences } from './PreferencesContext';

type InvitationOpsContextValue = {
  dashboard: MobileInvitationDashboard | null;
  pageSummary: MobilePageSummary | null;
  dashboardLoading: boolean;
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
};

const InvitationOpsContext = createContext<InvitationOpsContextValue | null>(null);

function buildPageSummaryFromConfig(
  page: MobileEditableInvitationPageConfig
): MobilePageSummary {
  return {
    slug: page.slug,
    displayName: page.config.displayName,
    published: page.published,
    productTier: page.productTier,
    defaultTheme: page.defaultTheme,
    features: page.features,
  };
}

function buildPageSummary(dashboard: MobileInvitationDashboard): MobilePageSummary {
  return buildPageSummaryFromConfig(dashboard.page);
}

function buildDashboardSnapshot(
  page: MobileEditableInvitationPageConfig | null | undefined,
  links: MobileInvitationLinks | null | undefined
): MobileInvitationDashboard | null {
  if (!page || !links) {
    return null;
  }

  return {
    page,
    comments: [],
    links,
  };
}

export function InvitationOpsProvider({ children }: PropsWithChildren) {
  const { apiBaseUrl } = usePreferences();
  const {
    session,
    initialDashboardSeed,
    consumeInitialDashboardSeed,
    reportAuthError,
  } = useAuth();

  const [dashboard, setDashboard] = useState<MobileInvitationDashboard | null>(null);
  const [pageSummary, setPageSummary] = useState<MobilePageSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const isRefreshingDashboardRef = useRef(false);
  const hasRequestedInitialDashboardRefreshRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) {
      setDashboard(null);
      setPageSummary(null);
      hasRequestedInitialDashboardRefreshRef.current = null;
    }
  }, [session]);

  useEffect(() => {
    if (!initialDashboardSeed) {
      return;
    }

    const snapshot = buildDashboardSnapshot(
      initialDashboardSeed.dashboardPage,
      initialDashboardSeed.links
    );

    setDashboard(snapshot);
    setPageSummary(
      snapshot ? buildPageSummary(snapshot) : initialDashboardSeed.pageFallback
    );
    consumeInitialDashboardSeed();
  }, [consumeInitialDashboardSeed, initialDashboardSeed]);

  const patchDashboard = useCallback(
    (
      updater: (current: MobileInvitationDashboard) => MobileInvitationDashboard
    ) => {
      setDashboard((current) => {
        if (!current) {
          return current;
        }

        const nextDashboard = updater(current);
        setPageSummary(buildPageSummary(nextDashboard));
        return nextDashboard;
      });
    },
    []
  );

  const refreshDashboard = useCallback(async () => {
    if (!session) {
      return false;
    }

    if (isRefreshingDashboardRef.current) {
      return false;
    }

    isRefreshingDashboardRef.current = true;
    setDashboardLoading(true);

    try {
      const nextDashboard = await fetchMobileInvitationDashboard(
        apiBaseUrl,
        session.pageSlug,
        session.token
      );

      setDashboard(nextDashboard);
      setPageSummary(buildPageSummary(nextDashboard));
      return true;
    } catch (error) {
      reportAuthError(
        error instanceof Error
          ? error.message
          : '운영 데이터를 불러오지 못했습니다.'
      );
      return false;
    } finally {
      setDashboardLoading(false);
      isRefreshingDashboardRef.current = false;
    }
  }, [apiBaseUrl, reportAuthError, session]);

  const saveCurrentPageConfig = useCallback(
    async (
      config: MobileInvitationSeed,
      options: {
        published?: boolean;
        defaultTheme?: MobileInvitationThemeKey;
      } = {}
    ) => {
      if (!session) {
        reportAuthError('청첩장 연동 후 저장할 수 있습니다.');
        return false;
      }

      setDashboardLoading(true);

      try {
        const trustedConfig: MobileInvitationSeed = {
          ...config,
          slug: session.pageSlug,
        };

        await saveMobileInvitationPageConfig(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          {
            config: trustedConfig,
            published: options.published ?? dashboard?.page.published,
            defaultTheme: options.defaultTheme ?? dashboard?.page.defaultTheme,
          }
        );

        patchDashboard((current) => ({
          ...current,
          page: {
            ...current.page,
            config: trustedConfig,
            published: options.published ?? current.page.published,
            defaultTheme: options.defaultTheme ?? current.page.defaultTheme,
          },
        }));
        return true;
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '청첩장 저장에 실패했습니다.'
        );
        return false;
      } finally {
        setDashboardLoading(false);
      }
    },
    [
      apiBaseUrl,
      dashboard?.page.defaultTheme,
      dashboard?.page.published,
      patchDashboard,
      reportAuthError,
      session,
    ]
  );

  const setPublishedState = useCallback(
    async (published: boolean) => {
      if (!session || !dashboard) {
        reportAuthError('청첩장 연동 후 공개 상태를 변경할 수 있습니다.');
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

        patchDashboard((current) => ({
          ...current,
          page: {
            ...current.page,
            published,
          },
        }));
        return true;
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '공개 상태를 변경하지 못했습니다.'
        );
        return false;
      } finally {
        setDashboardLoading(false);
      }
    },
    [apiBaseUrl, dashboard, patchDashboard, reportAuthError, session]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!session) {
        reportAuthError('청첩장 연동 후 댓글을 관리할 수 있습니다.');
        return false;
      }

      try {
        await deleteMobileInvitationComment(
          apiBaseUrl,
          session.pageSlug,
          commentId,
          session.token
        );

        patchDashboard((current) => ({
          ...current,
          comments: current.comments.filter((comment) => comment.id !== commentId),
        }));
        return true;
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '댓글을 삭제하지 못했습니다.'
        );
        return false;
      }
    },
    [apiBaseUrl, patchDashboard, reportAuthError, session]
  );

  const derivedDashboard = useMemo(() => {
    if (dashboard) {
      return dashboard;
    }
    if (!initialDashboardSeed) {
      return null;
    }
    return buildDashboardSnapshot(
      initialDashboardSeed.dashboardPage,
      initialDashboardSeed.links
    );
  }, [dashboard, initialDashboardSeed]);

  const derivedPageSummary = useMemo(() => {
    if (pageSummary) {
      return pageSummary;
    }
    if (derivedDashboard) {
      return buildPageSummary(derivedDashboard);
    }
    return initialDashboardSeed?.pageFallback ?? null;
  }, [derivedDashboard, initialDashboardSeed, pageSummary]);

  useEffect(() => {
    if (!session || !derivedDashboard || dashboardLoading) {
      return;
    }

    if (hasRequestedInitialDashboardRefreshRef.current === session.pageSlug) {
      return;
    }

    hasRequestedInitialDashboardRefreshRef.current = session.pageSlug;
    void refreshDashboard();
  }, [dashboardLoading, derivedDashboard, refreshDashboard, session]);

  const value = useMemo<InvitationOpsContextValue>(
    () => ({
      dashboard: derivedDashboard,
      pageSummary: derivedPageSummary,
      dashboardLoading,
      refreshDashboard,
      saveCurrentPageConfig,
      setPublishedState,
      deleteComment,
    }),
    [
      dashboardLoading,
      deleteComment,
      derivedDashboard,
      derivedPageSummary,
      refreshDashboard,
      saveCurrentPageConfig,
      setPublishedState,
    ]
  );

  return (
    <InvitationOpsContext.Provider value={value}>
      {children}
    </InvitationOpsContext.Provider>
  );
}

export function useInvitationOps() {
  const context = useContext(InvitationOpsContext);
  if (!context) {
    throw new Error('useInvitationOps must be used within InvitationOpsProvider.');
  }
  return context;
}
