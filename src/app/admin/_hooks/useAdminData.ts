'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEventDeletionFailureMessage, isEventDeletionComplete } from '@/lib/adminEventDeletionState';
import { getCustomerAssignmentConfirmation } from '@/lib/adminCustomerSelection';

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
import type { AdminCustomerAccountsSnapshot } from '@/services/adminCustomerService';
import type { AdminDashboardSummarySnapshot } from '@/services/adminDashboardService';
import {
  type AdminOwnershipInviteResult,
} from '@/services/eventOwnershipInviteService';
import {
  type Comment,
  type CommentSummary,
} from '@/services/commentService';
import {
  type InvitationPageSummary,
} from '@/services/invitationPageService';
import type { InvitationProductTier } from '@/types/invitationPage';

import { RECENT_COMMENT_DAYS, type AdminTab } from '../_components/adminPageUtils';
import type { AdminDataGateway } from './adminDataGateway';
import { getAdminDataLoadPolicy } from './adminDataLoadPolicy';
import { invalidateAdminOwnershipInviteStatus } from './adminOwnershipInviteQuery';
import { lockAdminMutation, settleAdminRefreshTasks } from './adminDataMutationPolicy';

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
  selectedEventSlug?: string | null;
  selectedEventDetailTab?: string | null;
  showToast: ToastFn;
  confirm: ConfirmFn;
  gateway: AdminDataGateway;
}

const EMPTY_COMMENT_SUMMARY: CommentSummary = {
  totalCount: 0,
  recentCount: 0,
};

export function useAdminData({
  isAdminLoggedIn,
  activeTab,
  selectedEventSlug,
  selectedEventDetailTab,
  showToast,
  confirm,
  gateway,
}: UseAdminDataParams) {
  const queryClient = useQueryClient();
  const mutationInProgress = useRef(false);
  const [deletingCommentToken, setDeletingCommentToken] = useState<string | null>(null);
  const [updatingPublishedPageSlug, setUpdatingPublishedPageSlug] = useState<string | null>(null);
  const [updatingVariantToken, setUpdatingVariantToken] = useState<string | null>(null);
  const [updatingTierPageSlug, setUpdatingTierPageSlug] = useState<string | null>(null);
  const [deletingPageSlug, setDeletingPageSlug] = useState<string | null>(null);
  const [deletingCustomerUid, setDeletingCustomerUid] = useState<string | null>(null);
  const [ownershipActionToken, setOwnershipActionToken] = useState<string | null>(null);
  const [issuingOwnershipInviteSlug, setIssuingOwnershipInviteSlug] = useState<string | null>(null);
  const [walletGrantActionToken, setWalletGrantActionToken] = useState<string | null>(null);

  const {
    pages: shouldLoadPages,
    comments: shouldLoadComments,
    accounts: shouldLoadAccounts,
    summary: shouldLoadSummary,
  } = getAdminDataLoadPolicy({ isAdminLoggedIn, activeTab, selectedEventSlug, selectedEventDetailTab });

  const dashboardSummaryQuery = useQuery<AdminDashboardSummarySnapshot>({
    queryKey: appQueryKeys.adminDashboardSummary(RECENT_COMMENT_DAYS),
    enabled: shouldLoadSummary,
    queryFn: async () => gateway.getDashboardSummary(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const pagesQuery = useQuery<InvitationPageSummary[]>({
    queryKey: appQueryKeys.adminInvitationPages,
    enabled: shouldLoadPages,
    queryFn: async () => gateway.getPages(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const commentsQuery = useQuery<Comment[]>({
    queryKey: appQueryKeys.adminComments,
    enabled: shouldLoadComments,
    queryFn: async () => gateway.getComments(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const accountsQuery = useQuery<AdminCustomerAccountsSnapshot>({
    queryKey: appQueryKeys.adminCustomerAccounts,
    enabled: shouldLoadAccounts,
    queryFn: async () => gateway.getCustomerAccounts(),
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const { refetch: refetchPagesQuery } = pagesQuery;
  const { refetch: refetchCommentsQuery } = commentsQuery;
  const { refetch: refetchAccountsQuery } = accountsQuery;

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
  const pagesError = pagesQuery.error instanceof Error ? pagesQuery.error : null;
  const commentsError = commentsQuery.error instanceof Error ? commentsQuery.error : null;
  const accountsError = accountsQuery.error instanceof Error ? accountsQuery.error : null;

  const retryPages = useCallback(async () => {
    await refetchPagesQuery();
  }, [refetchPagesQuery]);
  const retryComments = useCallback(async () => {
    await refetchCommentsQuery();
  }, [refetchCommentsQuery]);
  const retryAccounts = useCallback(async () => {
    await refetchAccountsQuery();
  }, [refetchAccountsQuery]);

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
      ownershipInviteSlug?: string | null;
    }) => {
      const tasks: Promise<unknown>[] = [];

      if (options.summary) {
        tasks.push(shouldLoadSummary
          ? dashboardSummaryQuery.refetch()
          : queryClient.invalidateQueries({ queryKey: appQueryKeys.adminDashboardSummary(RECENT_COMMENT_DAYS), refetchType: 'none' }));
      }

      if (options.pages) {
        if (shouldLoadPages) {
          tasks.push(pagesQuery.refetch());
        } else {
          tasks.push(
            queryClient.invalidateQueries({
              queryKey: appQueryKeys.adminInvitationPages,
              refetchType: 'none',
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
              refetchType: 'none',
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
              refetchType: 'none',
            })
          );
        }
      }

      if (options.invitationPageSlug) {
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.invitationPage(options.invitationPageSlug, 'public'),
          }, { throwOnError: true })
        );
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: appQueryKeys.invitationPage(options.invitationPageSlug, 'admin'),
          }, { throwOnError: true })
        );
      }

      if (options.ownershipInviteSlug) {
        tasks.push(invalidateAdminOwnershipInviteStatus(queryClient, options.ownershipInviteSlug));
      }
      return settleAdminRefreshTasks(tasks);
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
      shouldLoadSummary,
    ]
  );

  const showMutationSuccess = useCallback((toast: Parameters<ToastFn>[0], refreshed: boolean) => {
    showToast(refreshed ? toast : {
      title: '변경사항은 저장되었습니다. 최신 조회에 실패했습니다.',
      message: `${toast.title} 새로고침 또는 다시 시도로 최신 상태를 확인해 주세요.`,
      tone: 'info',
    });
  }, [showToast]);

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
        description: `${comment.author} 님의 댓글 “${comment.message.slice(0, 80)}${comment.message.length > 80 ? '…' : ''}”을 삭제합니다. 삭제 후에는 복구할 수 없습니다.`,
        confirmLabel: '삭제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      setDeletingCommentToken(`${comment.collectionName ?? 'comments'}:${comment.id}`);
      try {
        await gateway.deleteComment(comment);
        const refreshed = await refreshAdminData({
          summary: true,
          comments: true,
        });
        showMutationSuccess({ title: '댓글을 삭제했습니다.', tone: 'success' }, refreshed);
      } catch (deleteError) {
        console.error(deleteError);
        showToast({ title: '댓글 삭제에 실패했습니다.', tone: 'error' });
      } finally {
        setDeletingCommentToken(null);
      }
    },
    [confirm, gateway, refreshAdminData, showToast, showMutationSuccess]
  );

  const handleDeletePage = useCallback(
    async (page: InvitationPageSummary) => {
      const retry = page.deletion?.status === 'failed';
      if (retry && page.deletion?.retryable !== true) {
        showToast({ title: '삭제 원인 확인이 필요합니다.', message: '이 삭제 작업은 자동으로 재시도할 수 없습니다.', tone: 'error' });
        return;
      }
      const approved = await confirm({
        title: retry ? '중단된 삭제를 재시도할까요?' : '청첩장을 완전 삭제할까요?',
        description: `${page.displayName} 페이지와 연결된 운영 데이터가 모두 삭제됩니다.`,
        confirmLabel: retry ? '삭제 재시도' : '완전 삭제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      setDeletingPageSlug(page.slug);

      try {
        const result = await gateway.deleteEvent(page.slug, { retry });
        const refreshed = await refreshAdminData({
          summary: true,
          pages: true,
          comments: true,
          accounts: true,
          invitationPageSlug: page.slug,
        });
        if (!isEventDeletionComplete(result)) {
          throw new Error(getEventDeletionFailureMessage(result));
        }
        showMutationSuccess({ title: '청첩장을 완전 삭제했습니다.', tone: 'success' }, refreshed);
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
    [confirm, gateway, refreshAdminData, showToast, showMutationSuccess]
  );

  const handleAssignCustomerOwnership = useCallback(
    async (uid: string, pageSlug: string) => {
      const pageName = pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug;
      const description = getCustomerAssignmentConfirmation(customerAccounts, uid, pageName, pageSlug);
      if (!description) {
        showToast({ title: '연결할 고객을 다시 선택해 주세요.', tone: 'error' });
        return;
      }
      const approved = await confirm({
        title: '고객 계정에 청첩장을 연결할까요?',
        description,
        confirmLabel: '연결',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      const nextToken = `assign:${uid}:${pageSlug}`;
      setOwnershipActionToken(nextToken);

      try {
        await gateway.assignOwnership(uid, pageSlug);
        const refreshed = await refreshAdminData({
          accounts: true,
          ownershipInviteSlug: pageSlug,
          pages: true,
        });
        showMutationSuccess({
          title: '고객 계정에 청첩장을 연결했습니다.',
          tone: 'success',
        }, refreshed);
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
    [confirm, customerAccounts, gateway, pages, refreshAdminData, showToast, showMutationSuccess]
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
        await gateway.clearOwnership(pageSlug);
        const refreshed = await refreshAdminData({
          accounts: true,
          ownershipInviteSlug: pageSlug,
          pages: true,
        });
        showMutationSuccess({
          title: '고객 계정 연결을 해제했습니다.',
          tone: 'success',
        }, refreshed);
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
    [confirm, gateway, pages, refreshAdminData, showToast, showMutationSuccess]
  );

  const handleIssueOwnershipInvite = useCallback(
    async (pageSlug: string): Promise<AdminOwnershipInviteResult | null> => {
      setIssuingOwnershipInviteSlug(pageSlug);

      try {
        const result = await gateway.issueOwnershipInvite(pageSlug);
        const refreshed = await refreshAdminData({ ownershipInviteSlug: pageSlug });
        showMutationSuccess({
          title: '고객 연결 링크를 만들었습니다.',
          message: '7일 동안 사용할 수 있으며 가장 최근에 만든 링크만 유효합니다.',
          tone: 'success',
        }, refreshed);
        return result;
      } catch (error) {
        console.error(error);
        showToast({
          title: '고객 연결 링크 발급에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          tone: 'error',
        });
        return null;
      } finally {
        setIssuingOwnershipInviteSlug(null);
      }
    },
    [gateway, showToast, showMutationSuccess, refreshAdminData]
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
          ? `초대장 제작권 ${grant.quantity}개`
          : `모바일 초대장 생성 티켓 ${grant.quantity}장`;
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
        await gateway.grantWalletCredit(uid, {
          kind: grant.kind,
          quantity: grant.quantity,
          tier: grant.kind === 'pageCreation' ? grant.tier ?? 'premium' : null,
          note: grant.note ?? null,
        });
        const refreshed = await refreshAdminData({
          accounts: true,
        });
        showMutationSuccess({
          title: '고객 이용권을 지급했습니다.',
          tone: 'success',
        }, refreshed);
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
    [confirm, customerAccounts, gateway, refreshAdminData, showToast, showMutationSuccess]
  );

  const handleDeleteCustomerAccount = useCallback(
    async (uid: string) => {
      const account = customerAccounts.find((entry) => entry.uid === uid);
      const accountName = account?.displayName || account?.email || uid;
      const linkedEventCount = account?.linkedEvents.length ?? 0;
      const approved = await confirm({
        title: '고객 계정을 탈퇴 처리할까요?',
        description:
          `${accountName} 계정의 Firebase 로그인 계정과 보유 이용권 데이터를 삭제하고, ` +
          `연결된 청첩장 ${linkedEventCount}개의 고객 소유권을 해제한 뒤 즉시 비공개로 전환합니다. 청첩장 페이지 자체는 삭제되지 않습니다.`,
        confirmLabel: '탈퇴 처리',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      setDeletingCustomerUid(uid);

      try {
        const result = await gateway.deleteCustomer(uid);
        const refreshed = await refreshAdminData({
          accounts: true,
          pages: true,
        });
        showMutationSuccess({
          title: '고객 계정을 탈퇴 처리했습니다.',
          message:
            `연결된 청첩장 ${result.detachedEventCount}개의 소유권을 해제하고 ` +
            `${result.unpublishedEventCount}개를 비공개로 전환했습니다.`,
          tone: 'success',
        }, refreshed);
      } catch (error) {
        console.error(error);
        showToast({
          title: '고객 계정 탈퇴 처리에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
          tone: 'error',
        });
      } finally {
        setDeletingCustomerUid(null);
      }
    },
    [confirm, customerAccounts, gateway, refreshAdminData, showToast, showMutationSuccess]
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
        await gateway.setPublished(page, nextPublished);
        const refreshed = await refreshAdminData({
          summary: true,
          pages: true,
          invitationPageSlug: page.slug,
        });
        showMutationSuccess({
          title: nextPublished ? '페이지를 공개했습니다.' : '페이지를 비공개로 전환했습니다.',
          tone: 'success',
        }, refreshed);
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
    [confirm, gateway, refreshAdminData, showToast, showMutationSuccess]
  );

  const handleEnableVariant = useCallback(
    async (page: InvitationPageSummary, variantKey: InvitationThemeKey) => {
      const variantLabel = getInvitationThemeAdminLabel(variantKey);
      const approved = await confirm({
        title: `${variantLabel} 디자인을 연결할까요?`,
        description: `${page.displayName} 페이지에 ${variantLabel} 디자인을 연결합니다.`,
        confirmLabel: '연결',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      const token = `${page.slug}:${variantKey}`;
      setUpdatingVariantToken(token);

      try {
        await gateway.setVariant(page, variantKey, true);
        const refreshed = await refreshAdminData({
          pages: true,
          invitationPageSlug: page.slug,
        });
        showMutationSuccess({
          title: `${variantLabel} 디자인을 연결했습니다.`,
          tone: 'success',
        }, refreshed);
      } catch (error) {
        console.error(error);
        showToast({
          title: `${variantLabel} 디자인 연결에 실패했습니다.`,
          tone: 'error',
        });
      } finally {
        setUpdatingVariantToken(null);
      }
    },
    [confirm, gateway, refreshAdminData, showToast, showMutationSuccess]
  );

  const handleDisableVariant = useCallback(
    async (page: InvitationPageSummary, variantKey: InvitationThemeKey) => {
      const variantLabel = getInvitationThemeAdminLabel(variantKey);
      const availableVariantCount = Object.values(page.variants ?? {}).filter(
        (variant) => variant?.available === true
      ).length;

      if (availableVariantCount <= 1) {
        showToast({
          title: '최소 1개의 디자인은 연결되어 있어야 합니다.',
          tone: 'error',
        });
        return;
      }

      const approved = await confirm({
        title: `${variantLabel} 디자인 연결을 해제할까요?`,
        description: `${page.displayName} 페이지에서 ${variantLabel} 디자인 연결을 해제합니다.`,
        confirmLabel: '연결 해제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      const token = `${page.slug}:${variantKey}`;
      setUpdatingVariantToken(token);

      try {
        await gateway.setVariant(page, variantKey, false);
        const refreshed = await refreshAdminData({
          pages: true,
          invitationPageSlug: page.slug,
        });
        showMutationSuccess({
          title: `${variantLabel} 디자인 연결을 해제했습니다.`,
          tone: 'success',
        }, refreshed);
      } catch (error) {
        console.error(error);
        showToast({
          title: `${variantLabel} 디자인 연결 해제에 실패했습니다.`,
          tone: 'error',
        });
      } finally {
        setUpdatingVariantToken(null);
      }
    },
    [confirm, gateway, refreshAdminData, showToast, showMutationSuccess]
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
        await gateway.setTier(page, nextTier);
        const refreshed = await refreshAdminData({
          pages: true,
          invitationPageSlug: page.slug,
        });
        showMutationSuccess({
          title: `상품 등급을 ${nextTier.toUpperCase()}로 변경했습니다.`,
          tone: 'success',
        }, refreshed);
      } catch (error) {
        console.error(error);
        showToast({ title: '상품 등급 변경에 실패했습니다.', tone: 'error' });
      } finally {
        setUpdatingTierPageSlug(null);
      }
    },
    [confirm, gateway, refreshAdminData, showToast, showMutationSuccess]
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
    queryClient.removeQueries({
      queryKey: ['admin-ownership-invite-status'],
    });
  }, [queryClient]);

  const mutations = useMemo(() => ({
    handleDeleteComment: lockAdminMutation(mutationInProgress, handleDeleteComment, undefined),
    handleDeletePage: lockAdminMutation(mutationInProgress, handleDeletePage, undefined),
    handleAssignCustomerOwnership: lockAdminMutation(mutationInProgress, handleAssignCustomerOwnership, undefined),
    handleClearCustomerOwnership: lockAdminMutation(mutationInProgress, handleClearCustomerOwnership, undefined),
    handleIssueOwnershipInvite: lockAdminMutation(mutationInProgress, handleIssueOwnershipInvite, null),
    handleGrantCustomerWalletCredit: lockAdminMutation(mutationInProgress, handleGrantCustomerWalletCredit, undefined),
    handleDeleteCustomerAccount: lockAdminMutation(mutationInProgress, handleDeleteCustomerAccount, undefined),
    handleTogglePublished: lockAdminMutation(mutationInProgress, handleTogglePublished, undefined),
    handleEnableVariant: lockAdminMutation(mutationInProgress, handleEnableVariant, undefined),
    handleDisableVariant: lockAdminMutation(mutationInProgress, handleDisableVariant, undefined),
    handleChangeTier: lockAdminMutation(mutationInProgress, handleChangeTier, undefined),
  }), [handleDeleteComment, handleDeletePage, handleAssignCustomerOwnership,
    handleClearCustomerOwnership, handleIssueOwnershipInvite, handleGrantCustomerWalletCredit,
    handleDeleteCustomerAccount, handleTogglePublished, handleEnableVariant,
    handleDisableVariant, handleChangeTier]);

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
    pagesError,
    commentsError,
    accountsError,
    updatingPublishedPageSlug,
    updatingVariantToken,
    updatingTierPageSlug,
    deletingPageSlug,
    deletingCommentToken,
    deletingCustomerUid,
    ownershipActionToken,
    issuingOwnershipInviteSlug,
    walletGrantActionToken,

    refreshPages,
    fetchComments,
    fetchCustomerAccounts,
    fetchSummarySources,
    retryPages,
    retryComments,
    retryAccounts,

    ...mutations,
    handleLogout,
  };
}
