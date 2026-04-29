'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearAdminInvitationPreviewCache,
  writeAdminInvitationPreviewCache,
} from '@/lib/adminInvitationPreviewCache';
import {
  ADMIN_GC_TIME_MS,
  ADMIN_STALE_TIME_MS,
  appQueryKeys,
} from '@/lib/appQuery';
import {
  getInvitationThemeAdminLabel,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import {
  assignAdminCustomerEventOwnership,
  clearAdminCustomerEventOwnership,
  deleteAdminEventByPageSlug,
  deleteComment,
  getAdminCustomerAccountsSnapshot,
  getAdminDashboardSummary,
  getAllComments,
  getAllManagedInvitationPages,
  grantAdminCustomerWalletCredit,
  setInvitationPageProductTier,
  setInvitationPagePublished,
  setInvitationPageVariantAvailability,
  type AdminCustomerAccountsSnapshot,
  type AdminDashboardSummarySnapshot,
  type Comment,
  type CommentSummary,
  type InvitationPageSummary,
} from '@/services';
import type { InvitationProductTier } from '@/types/invitationPage';

import { RECENT_COMMENT_DAYS, type AdminTab } from '../_components/adminPageUtils';

type ToastFn = (toast: { title: string; message?: string; tone: 'success' | 'error' | 'info' }) => void;
type ConfirmFn = (options: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
}) => Promise<boolean>;

interface UseAdminDataParams {
  isAdminLoggedIn: boolean;
  activeTab: AdminTab;
  showToast: ToastFn;
  confirm: ConfirmFn;
}

const EMPTY_COMMENT_SUMMARY: CommentSummary = {
  totalCount: 0,
  recentCount: 0,
};

export function useAdminData({
  isAdminLoggedIn,
  activeTab,
  showToast,
  confirm,
}: UseAdminDataParams) {
  const queryClient = useQueryClient();
  const [updatingPublishedPageSlug, setUpdatingPublishedPageSlug] = useState<string | null>(null);
  const [updatingVariantToken, setUpdatingVariantToken] = useState<string | null>(null);
  const [updatingTierPageSlug, setUpdatingTierPageSlug] = useState<string | null>(null);
  const [deletingPageSlug, setDeletingPageSlug] = useState<string | null>(null);
  const [ownershipActionToken, setOwnershipActionToken] = useState<string | null>(null);
  const [walletGrantActionToken, setWalletGrantActionToken] = useState<string | null>(null);

  const shouldLoadPages =
    isAdminLoggedIn &&
    (activeTab === 'pages' ||
      activeTab === 'comments' ||
      activeTab === 'periods');
  const shouldLoadComments = isAdminLoggedIn && activeTab === 'comments';
  const shouldLoadAccounts = isAdminLoggedIn && activeTab === 'accounts';

  const dashboardSummaryQuery = useQuery<AdminDashboardSummarySnapshot>({
    queryKey: appQueryKeys.adminDashboardSummary(RECENT_COMMENT_DAYS),
    enabled: isAdminLoggedIn,
    queryFn: async () => getAdminDashboardSummary(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const pagesQuery = useQuery<InvitationPageSummary[]>({
    queryKey: appQueryKeys.adminInvitationPages,
    enabled: shouldLoadPages,
    queryFn: async () => getAllManagedInvitationPages(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const commentsQuery = useQuery<Comment[]>({
    queryKey: appQueryKeys.adminComments,
    enabled: shouldLoadComments,
    queryFn: async () => getAllComments(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const accountsQuery = useQuery<AdminCustomerAccountsSnapshot>({
    queryKey: appQueryKeys.adminCustomerAccounts,
    enabled: shouldLoadAccounts,
    queryFn: async () => getAdminCustomerAccountsSnapshot(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });

  const pages = useMemo(() => pagesQuery.data ?? [], [pagesQuery.data]);
  const comments = useMemo(() => commentsQuery.data ?? [], [commentsQuery.data]);
  const customerAccounts = useMemo(
    () => accountsQuery.data?.accounts ?? [],
    [accountsQuery.data?.accounts]
  );
  const unassignedCustomerEvents = useMemo(
    () => accountsQuery.data?.unassignedEvents ?? [],
    [accountsQuery.data?.unassignedEvents]
  );
  const dashboardSummary = dashboardSummaryQuery.data ?? null;
  const memoryPublicCount = dashboardSummary?.memoryPublicCount ?? 0;
  const commentSummary = dashboardSummary
    ? {
        totalCount: dashboardSummary.commentSummary.totalCount,
        recentCount: dashboardSummary.commentSummary.recentCount,
      }
    : EMPTY_COMMENT_SUMMARY;

  const pagesLoading = pagesQuery.isPending;
  const pagesRefreshing = pagesQuery.isRefetching;
  const commentsLoading = commentsQuery.isPending;
  const commentsRefreshing = commentsQuery.isRefetching;
  const summaryLoading = dashboardSummaryQuery.isPending;
  const summaryRefreshing = dashboardSummaryQuery.isRefetching;
  const accountsLoading = accountsQuery.isPending;
  const accountsRefreshing = accountsQuery.isRefetching;

  useEffect(() => {
    if (!isAdminLoggedIn) {
      clearAdminInvitationPreviewCache();
      return;
    }

    if (pages.length > 0) {
      writeAdminInvitationPreviewCache(pages);
    }
  }, [isAdminLoggedIn, pages]);

  const refreshAdminData = useCallback(
    async (options: {
      summary?: boolean;
      pages?: boolean;
      comments?: boolean;
      accounts?: boolean;
      invitationPageSlug?: string | null;
    }) => {
      const tasks: Promise<unknown>[] = [];

      if (options.summary) {
        tasks.push(dashboardSummaryQuery.refetch());
      }

      if (options.pages) {
        if (shouldLoadPages) {
          tasks.push(pagesQuery.refetch());
        } else {
          tasks.push(
            queryClient.invalidateQueries({
              queryKey: appQueryKeys.adminInvitationPages,
            })
          );
        }
      }

      if (options.comments) {
        if (shouldLoadComments) {
          tasks.push(commentsQuery.refetch());
        } else {
          tasks.push(
            queryClient.invalidateQueries({
              queryKey: appQueryKeys.adminComments,
            })
          );
        }
      }

      if (options.accounts) {
        if (shouldLoadAccounts) {
          tasks.push(accountsQuery.refetch());
        } else {
          tasks.push(
            queryClient.invalidateQueries({
              queryKey: appQueryKeys.adminCustomerAccounts,
            })
          );
        }
      }

      if (options.invitationPageSlug) {
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.invitationPage(options.invitationPageSlug, 'public'),
          })
        );
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.invitationPage(options.invitationPageSlug, 'admin'),
          })
        );
      }

      await Promise.all(tasks);
    },
    [
      accountsQuery,
      commentsQuery,
      dashboardSummaryQuery,
      pagesQuery,
      queryClient,
      shouldLoadAccounts,
      shouldLoadComments,
      shouldLoadPages,
    ]
  );

  const fetchSummarySources = useCallback(async () => {
    await refreshAdminData({
      summary: true,
      pages: true,
    });
  }, [refreshAdminData]);

  const refreshPages = useCallback(async () => {
    await refreshAdminData({
      summary: true,
      pages: true,
    });
  }, [refreshAdminData]);

  const fetchComments = useCallback(async () => {
    await refreshAdminData({
      summary: true,
      comments: true,
    });
  }, [refreshAdminData]);

  const fetchCustomerAccounts = useCallback(async () => {
    await refreshAdminData({
      accounts: true,
    });
  }, [refreshAdminData]);

  const handleDeleteComment = useCallback(
    async (comment: Comment) => {
      const approved = await confirm({
        title: '댓글을 삭제할까요?',
        description: `${comment.author} 님의 댓글을 삭제하면 복구할 수 없습니다.`,
        confirmLabel: '삭제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      try {
        await deleteComment(comment.id, comment.collectionName);
        await refreshAdminData({
          summary: true,
          comments: true,
        });
        showToast({ title: '댓글을 삭제했습니다.', tone: 'success' });
      } catch (deleteError) {
        console.error(deleteError);
        showToast({ title: '댓글 삭제에 실패했습니다.', tone: 'error' });
      }
    },
    [confirm, refreshAdminData, showToast]
  );

  const handleDeletePage = useCallback(
    async (page: InvitationPageSummary) => {
      const approved = await confirm({
        title: '청첩장을 완전 삭제할까요?',
        description: `${page.displayName} 페이지와 연결된 운영 데이터가 모두 삭제됩니다.`,
        confirmLabel: '완전 삭제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      setDeletingPageSlug(page.slug);

      try {
        await deleteAdminEventByPageSlug(page.slug);
        await refreshAdminData({
          summary: true,
          pages: true,
          comments: true,
          accounts: true,
          invitationPageSlug: page.slug,
        });
        showToast({ title: '청첩장을 완전 삭제했습니다.', tone: 'success' });
      } catch (error) {
        console.error(error);
        showToast({
          title: '청첩장 전체 삭제에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          tone: 'error',
        });
      } finally {
        setDeletingPageSlug(null);
      }
    },
    [confirm, refreshAdminData, showToast]
  );

  const handleAssignCustomerOwnership = useCallback(
    async (uid: string, pageSlug: string) => {
      const pageName = pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug;
      const approved = await confirm({
        title: '고객 계정에 청첩장을 연결할까요?',
        description: `${pageName} 청첩장을 선택한 고객 계정에 연결합니다.`,
        confirmLabel: '연결',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      const nextToken = `assign:${uid}:${pageSlug}`;
      setOwnershipActionToken(nextToken);

      try {
        await assignAdminCustomerEventOwnership(uid, pageSlug);
        await refreshAdminData({
          accounts: true,
          pages: true,
        });
        showToast({
          title: '고객 계정에 청첩장을 연결했습니다.',
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: '고객 계정 연결에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          tone: 'error',
        });
      } finally {
        setOwnershipActionToken(null);
      }
    },
    [confirm, pages, refreshAdminData, showToast]
  );

  const handleClearCustomerOwnership = useCallback(
    async (pageSlug: string) => {
      const pageName = pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug;
      const approved = await confirm({
        title: '고객 계정 연결을 해제할까요?',
        description: `${pageName} 청첩장의 고객 계정 연결을 해제합니다.`,
        confirmLabel: '연결 해제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      const nextToken = `clear:${pageSlug}`;
      setOwnershipActionToken(nextToken);

      try {
        await clearAdminCustomerEventOwnership(pageSlug);
        await refreshAdminData({
          accounts: true,
          pages: true,
        });
        showToast({
          title: '고객 계정 연결을 해제했습니다.',
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: '고객 계정 연결 해제에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          tone: 'error',
        });
      } finally {
        setOwnershipActionToken(null);
      }
    },
    [confirm, pages, refreshAdminData, showToast]
  );

  const handleGrantCustomerWalletCredit = useCallback(
    async (
      uid: string,
      grant: {
        kind: 'pageCreation' | 'operationTicket';
        quantity: number;
        tier?: InvitationProductTier | null;
        note?: string | null;
      }
    ) => {
      const account = customerAccounts.find((entry) => entry.uid === uid);
      const accountName = account?.displayName || account?.email || uid;
      const grantLabel =
        grant.kind === 'pageCreation'
          ? `${(grant.tier ?? 'standard').toUpperCase()} 제작권 ${grant.quantity}개`
          : `운영 티켓 ${grant.quantity}장`;
      const approved = await confirm({
        title: '고객에게 이용권을 지급할까요?',
        description: `${accountName} 계정에 ${grantLabel}를 지급합니다.`,
        confirmLabel: '지급',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      const nextToken = `grant:${uid}:${grant.kind}`;
      setWalletGrantActionToken(nextToken);

      try {
        await grantAdminCustomerWalletCredit({
          uid,
          kind: grant.kind,
          quantity: grant.quantity,
          tier: grant.kind === 'pageCreation' ? grant.tier ?? 'standard' : null,
          note: grant.note ?? null,
        });
        await refreshAdminData({
          accounts: true,
        });
        showToast({
          title: '고객 이용권을 지급했습니다.',
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: '고객 이용권 지급에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          tone: 'error',
        });
      } finally {
        setWalletGrantActionToken(null);
      }
    },
    [confirm, customerAccounts, refreshAdminData, showToast]
  );

  const handleTogglePublished = useCallback(
    async (page: InvitationPageSummary, nextPublished: boolean) => {
      if (nextPublished === page.published) {
        return;
      }

      const approved = await confirm({
        title: nextPublished ? '페이지를 공개할까요?' : '페이지를 비공개로 전환할까요?',
        description: `${page.displayName} 페이지의 공개 상태를 변경합니다.`,
        confirmLabel: nextPublished ? '공개' : '비공개',
        cancelLabel: '취소',
        tone: nextPublished ? 'primary' : 'danger',
      });

      if (!approved) {
        return;
      }

      setUpdatingPublishedPageSlug(page.slug);

      try {
        await setInvitationPagePublished(page.slug, nextPublished, {
          defaultTheme: page.defaultTheme,
        });
        await refreshAdminData({
          summary: true,
          pages: true,
          invitationPageSlug: page.slug,
        });
        showToast({
          title: nextPublished ? '페이지를 공개했습니다.' : '페이지를 비공개로 전환했습니다.',
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: nextPublished ? '페이지 공개에 실패했습니다.' : '페이지 비공개 전환에 실패했습니다.',
          tone: 'error',
        });
      } finally {
        setUpdatingPublishedPageSlug(null);
      }
    },
    [confirm, refreshAdminData, showToast]
  );

  const handleEnableVariant = useCallback(
    async (page: InvitationPageSummary, variantKey: InvitationThemeKey) => {
      const variantLabel = getInvitationThemeAdminLabel(variantKey);
      const approved = await confirm({
        title: `${variantLabel} 미리보기를 추가할까요?`,
        description: `${page.displayName} 페이지에 ${variantLabel} 미리보기를 추가합니다.`,
        confirmLabel: '추가',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      const token = `${page.slug}:${variantKey}`;
      setUpdatingVariantToken(token);

      try {
        await setInvitationPageVariantAvailability(page.slug, variantKey, true, {
          published: page.published,
          defaultTheme: page.defaultTheme,
        });
        await refreshAdminData({
          pages: true,
          invitationPageSlug: page.slug,
        });
        showToast({
          title: `${variantLabel} 미리보기를 추가했습니다.`,
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: `${variantLabel} 미리보기 추가에 실패했습니다.`,
          tone: 'error',
        });
      } finally {
        setUpdatingVariantToken(null);
      }
    },
    [confirm, refreshAdminData, showToast]
  );

  const handleDisableVariant = useCallback(
    async (page: InvitationPageSummary, variantKey: InvitationThemeKey) => {
      const variantLabel = getInvitationThemeAdminLabel(variantKey);
      const availableVariantCount = Object.values(page.variants ?? {}).filter(
        (variant) => variant?.available === true
      ).length;

      if (availableVariantCount <= 1) {
        showToast({
          title: '최소 1개의 미리보기는 유지해야 합니다.',
          tone: 'error',
        });
        return;
      }

      const approved = await confirm({
        title: `${variantLabel} 미리보기를 제거할까요?`,
        description: `${page.displayName} 페이지에서 ${variantLabel} 미리보기를 제거합니다.`,
        confirmLabel: '제거',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      const token = `${page.slug}:${variantKey}`;
      setUpdatingVariantToken(token);

      try {
        await setInvitationPageVariantAvailability(page.slug, variantKey, false, {
          published: page.published,
          defaultTheme: page.defaultTheme,
        });
        await refreshAdminData({
          pages: true,
          invitationPageSlug: page.slug,
        });
        showToast({
          title: `${variantLabel} 미리보기를 제거했습니다.`,
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: `${variantLabel} 미리보기 제거에 실패했습니다.`,
          tone: 'error',
        });
      } finally {
        setUpdatingVariantToken(null);
      }
    },
    [confirm, refreshAdminData, showToast]
  );

  const handleChangeTier = useCallback(
    async (page: InvitationPageSummary, nextTier: InvitationProductTier) => {
      if (nextTier === page.productTier) {
        return;
      }

      const approved = await confirm({
        title: '상품 등급을 변경할까요?',
        description: `${page.displayName} 페이지의 상품 등급을 ${nextTier.toUpperCase()}로 바꿉니다.`,
        confirmLabel: '변경',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      setUpdatingTierPageSlug(page.slug);

      try {
        await setInvitationPageProductTier(page.slug, nextTier);
        await refreshAdminData({
          pages: true,
          invitationPageSlug: page.slug,
        });
        showToast({
          title: `상품 등급을 ${nextTier.toUpperCase()}로 변경했습니다.`,
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({ title: '상품 등급 변경에 실패했습니다.', tone: 'error' });
      } finally {
        setUpdatingTierPageSlug(null);
      }
    },
    [confirm, refreshAdminData, showToast]
  );

  const handleLogout = useCallback(() => {
    clearAdminInvitationPreviewCache();
    queryClient.removeQueries({
      queryKey: appQueryKeys.adminDashboardSummary(RECENT_COMMENT_DAYS),
    });
    queryClient.removeQueries({
      queryKey: appQueryKeys.adminInvitationPages,
    });
    queryClient.removeQueries({
      queryKey: appQueryKeys.adminComments,
    });
    queryClient.removeQueries({
      queryKey: appQueryKeys.adminCustomerAccounts,
    });
  }, [queryClient]);

  return {
    pages,
    comments,
    customerAccounts,
    unassignedCustomerEvents,
    memoryPublicCount,
    commentSummary,
    dashboardSummary,

    pagesLoading,
    pagesRefreshing,
    commentsLoading,
    commentsRefreshing,
    summaryLoading,
    summaryRefreshing,
    accountsLoading,
    accountsRefreshing,
    updatingPublishedPageSlug,
    updatingVariantToken,
    updatingTierPageSlug,
    deletingPageSlug,
    ownershipActionToken,
    walletGrantActionToken,

    refreshPages,
    fetchComments,
    fetchCustomerAccounts,
    fetchSummarySources,

    handleDeleteComment,
    handleDeletePage,
    handleAssignCustomerOwnership,
    handleClearCustomerOwnership,
    handleGrantCustomerWalletCredit,
    handleTogglePublished,
    handleChangeTier,
    handleEnableVariant,
    handleDisableVariant,
    handleLogout,
  };
}
