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
  adjustMobileInvitationTicketCount,
  extendMobileInvitationDisplayPeriod,
  fetchMobileInvitationDashboard,
  manageMobileInvitationComment,
  saveMobileInvitationPageConfig,
  setMobileInvitationDisplayPeriod,
  setMobileInvitationPublishedState,
  transferMobileInvitationTicketCount,
  setMobileInvitationVariantAvailability,
} from '../lib/api';
import type {
  MobileDisplayPeriodSummary,
  MobileEditableInvitationPageConfig,
  MobileGuestbookComment,
  MobileGuestbookCommentAction,
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
  refreshDashboard: (options?: { includeComments?: boolean }) => Promise<boolean>;
  saveCurrentPageConfig: (
    config: MobileInvitationSeed,
    options?: {
      published?: boolean;
      defaultTheme?: MobileInvitationThemeKey;
    }
  ) => Promise<boolean>;
  setVariantAvailability: (
    variantKey: MobileInvitationThemeKey,
    available: boolean
  ) => Promise<boolean>;
  setPublishedState: (published: boolean) => Promise<boolean>;
  extendDisplayPeriod: (
    months?: number
  ) => Promise<MobileDisplayPeriodSummary | null>;
  setDisplayPeriod: (
    period: MobileDisplayPeriodSummary
  ) => Promise<MobileDisplayPeriodSummary | null>;
  adjustTicketCount: (amount: number) => Promise<number | null>;
  transferTicketCount: (
    targetPageSlug: string,
    targetToken: string,
    amount: number
  ) => Promise<{ sourceTicketCount: number; targetTicketCount: number } | null>;
  manageComment: (
    commentId: string,
    action: MobileGuestbookCommentAction
  ) => Promise<MobileGuestbookComment | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
};

const InvitationOpsContext = createContext<InvitationOpsContextValue | null>(null);

function buildPageSummaryFromConfig(
  page: MobileEditableInvitationPageConfig,
  ticketCount: number,
  displayPeriod: MobileInvitationDashboard['displayPeriod']
): MobilePageSummary {
  return {
    slug: page.slug,
    displayName: page.config.displayName,
    published: page.published,
    productTier: page.productTier,
    defaultTheme: page.defaultTheme,
    features: page.features,
    ticketCount,
    displayPeriod,
  };
}

function buildPageSummary(dashboard: MobileInvitationDashboard): MobilePageSummary {
  return buildPageSummaryFromConfig(
    dashboard.page,
    dashboard.ticketCount,
    dashboard.displayPeriod
  );
}

function buildDashboardSnapshot(
  page: MobileEditableInvitationPageConfig | null | undefined,
  links: MobileInvitationLinks | null | undefined,
  ticketCount: number,
  pageFallback: MobilePageSummary | null | undefined,
  permissions: MobileInvitationDashboard['permissions'] | null | undefined
): MobileInvitationDashboard | null {
  if (!page || !links) {
    return null;
  }

  return {
    page,
    comments: [],
    commentCount: 0,
    commentsIncluded: false,
    permissions:
      permissions ?? {
        canViewDashboard: false,
        canEditInvitation: false,
        canManageGuestbook: false,
        canUploadImages: false,
        canManagePublication: false,
        canManageDisplayPeriod: false,
        canManageTickets: false,
        canIssueLinkToken: false,
      },
    links,
    ticketCount,
    displayPeriod: pageFallback?.displayPeriod ?? {
      enabled: false,
      startDate: null,
      endDate: null,
    },
  };
}

export function InvitationOpsProvider({ children }: PropsWithChildren) {
  const { apiBaseUrl } = usePreferences();
  const {
    getHighRiskToken,
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
      initialDashboardSeed.links,
      initialDashboardSeed.ticketCount,
      initialDashboardSeed.pageFallback,
      initialDashboardSeed.permissions
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

  const applyDisplayPeriod = useCallback(
    (displayPeriod: MobileDisplayPeriodSummary) => {
      setDashboard((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          displayPeriod,
        };
      });
      setPageSummary((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          displayPeriod,
        };
      });
    },
    []
  );

  const refreshDashboard = useCallback(async (options: { includeComments?: boolean } = {}) => {
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
        session.token,
        {
          includeComments: options.includeComments,
        }
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
        reportAuthError('청첩장을 연동해야 저장할 수 있습니다.');
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
          },
          getHighRiskToken(session.pageSlug) ?? undefined
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
      getHighRiskToken,
      patchDashboard,
      reportAuthError,
      session,
    ]
  );

  const setPublishedState = useCallback(
    async (published: boolean) => {
      if (!session || !dashboard) {
        reportAuthError('청첩장을 연동해야 공개 상태를 변경할 수 있습니다.');
        return false;
      }

      setDashboardLoading(true);

      try {
        await setMobileInvitationPublishedState(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          published,
          dashboard.page.defaultTheme,
          getHighRiskToken(session.pageSlug) ?? undefined
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
    [apiBaseUrl, dashboard, getHighRiskToken, patchDashboard, reportAuthError, session]
  );

  const setVariantAvailability = useCallback(
    async (variantKey: MobileInvitationThemeKey, available: boolean) => {
      if (!session || !dashboard) {
        reportAuthError('청첩장을 연동해야 디자인 구성을 변경할 수 있습니다.');
        return false;
      }

      setDashboardLoading(true);

      try {
        await setMobileInvitationVariantAvailability(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          variantKey,
          available,
          {
            published: dashboard.page.published,
            defaultTheme: dashboard.page.defaultTheme,
          },
          getHighRiskToken(session.pageSlug) ?? undefined
        );

        patchDashboard((current) => {
          const sourceVariants = current.page.config.variants ?? {};
          const sourceVariant = sourceVariants[variantKey];

          return {
            ...current,
            page: {
              ...current.page,
              config: {
                ...current.page.config,
                variants: {
                  ...sourceVariants,
                  [variantKey]: {
                    ...(sourceVariant ?? {}),
                    available,
                  },
                },
              },
            },
          };
        });
        return true;
      } catch (error) {
        reportAuthError(
          error instanceof Error
            ? error.message
            : '디자인 구성을 변경하지 못했습니다.'
        );
        return false;
      } finally {
        setDashboardLoading(false);
      }
    },
    [apiBaseUrl, dashboard, getHighRiskToken, patchDashboard, reportAuthError, session]
  );

  const adjustTicketCount = useCallback(
    async (amount: number) => {
      if (!session) {
        reportAuthError('청첩장을 연동해야 티켓 수량을 변경할 수 있습니다.');
        return null;
      }

      try {
        const response = await adjustMobileInvitationTicketCount(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          amount,
          getHighRiskToken(session.pageSlug) ?? undefined
        );

        setDashboard((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            ticketCount: response.ticketCount,
          };
        });
        setPageSummary((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            ticketCount: response.ticketCount,
          };
        });

        return response.ticketCount;
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '티켓 수량을 변경하지 못했습니다.'
        );
        return null;
      }
    },
    [apiBaseUrl, getHighRiskToken, reportAuthError, session]
  );

  const extendDisplayPeriod = useCallback(
    async (months = 1) => {
      if (!session) {
        reportAuthError('기간을 연장할 청첩장이 연동되어 있지 않습니다.');
        return null;
      }

      try {
        const response = await extendMobileInvitationDisplayPeriod(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          months,
          getHighRiskToken(session.pageSlug) ?? undefined
        );

        const displayPeriod = {
          enabled: response.enabled,
          startDate: response.startDate,
          endDate: response.endDate,
        };

        applyDisplayPeriod(displayPeriod);
        return displayPeriod;
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '노출 기간을 연장하지 못했습니다.'
        );
        return null;
      }
    },
    [apiBaseUrl, applyDisplayPeriod, getHighRiskToken, reportAuthError, session]
  );

  const setDisplayPeriod = useCallback(
    async (period: MobileDisplayPeriodSummary) => {
      if (!session) {
        reportAuthError('기간을 변경할 청첩장이 연동되어 있지 않습니다.');
        return null;
      }

      try {
        const response = await setMobileInvitationDisplayPeriod(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          period,
          getHighRiskToken(session.pageSlug) ?? undefined
        );

        const nextDisplayPeriod = {
          enabled: response.enabled,
          startDate: response.startDate,
          endDate: response.endDate,
        };

        applyDisplayPeriod(nextDisplayPeriod);
        return nextDisplayPeriod;
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '노출 기간을 되돌리지 못했습니다.'
        );
        return null;
      }
    },
    [apiBaseUrl, applyDisplayPeriod, getHighRiskToken, reportAuthError, session]
  );

  const transferTicketCount = useCallback(
    async (targetPageSlug: string, targetToken: string, amount: number) => {
      if (!session) {
        reportAuthError('청첩장을 연동해야 티켓을 이동할 수 있습니다.');
        return null;
      }

      try {
        const response = await transferMobileInvitationTicketCount(
          apiBaseUrl,
          session.pageSlug,
          session.token,
          {
            amount,
            targetPageSlug,
            targetToken,
          },
          getHighRiskToken(session.pageSlug) ?? undefined
        );

        setDashboard((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            ticketCount: response.ticketCount,
          };
        });
        setPageSummary((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            ticketCount: response.ticketCount,
          };
        });

        return {
          sourceTicketCount: response.ticketCount,
          targetTicketCount: response.targetTicketCount,
        };
      } catch (error) {
        reportAuthError(
          error instanceof Error ? error.message : '티켓을 이동하지 못했습니다.'
        );
        return null;
      }
    },
    [apiBaseUrl, getHighRiskToken, reportAuthError, session]
  );

  const applyManagedComment = useCallback(
    (nextComment: MobileGuestbookComment) => {
      patchDashboard((current) => {
        if (!current.commentsIncluded) {
          return current;
        }

        const hasExistingComment = current.comments.some(
          (comment) => comment.id === nextComment.id
        );

        return {
          ...current,
          comments: hasExistingComment
            ? current.comments.map((comment) =>
                comment.id === nextComment.id ? nextComment : comment
              )
            : [nextComment, ...current.comments],
        };
      });
    },
    [patchDashboard]
  );

  const manageComment = useCallback(
    async (commentId: string, action: MobileGuestbookCommentAction) => {
      if (!session) {
        reportAuthError('청첩장을 연동해야 방명록을 관리할 수 있습니다.');
        return null;
      }

      try {
        const response = await manageMobileInvitationComment(
          apiBaseUrl,
          session.pageSlug,
          commentId,
          session.token,
          action
        );

        if (response.comment) {
          applyManagedComment(response.comment);
        }

        return response.comment ?? null;
      } catch (error) {
        reportAuthError(
          error instanceof Error
            ? error.message
            : '방명록 상태를 변경하지 못했습니다.'
        );
        return null;
      }
    },
    [apiBaseUrl, applyManagedComment, reportAuthError, session]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const updatedComment = await manageComment(commentId, 'scheduleDelete');
      return Boolean(updatedComment);
    },
    [manageComment]
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
      initialDashboardSeed.links,
      initialDashboardSeed.ticketCount,
      initialDashboardSeed.pageFallback,
      initialDashboardSeed.permissions
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
      setVariantAvailability,
      setPublishedState,
      extendDisplayPeriod,
      setDisplayPeriod,
      adjustTicketCount,
      transferTicketCount,
      manageComment,
      deleteComment,
    }),
    [
      dashboardLoading,
      manageComment,
      deleteComment,
      derivedDashboard,
      derivedPageSummary,
      refreshDashboard,
      saveCurrentPageConfig,
      setVariantAvailability,
      setPublishedState,
      extendDisplayPeriod,
      setDisplayPeriod,
      adjustTicketCount,
      transferTicketCount,
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
