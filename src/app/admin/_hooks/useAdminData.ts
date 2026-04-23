'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  clearAdminInvitationPreviewCache,
  writeAdminInvitationPreviewCache,
} from '@/lib/adminInvitationPreviewCache';
import {
  getInvitationThemeAdminLabel,
  type InvitationThemeKey,
} from '@/lib/invitationThemes';
import {
  assignAdminCustomerEventOwnership,
  clearAdminCustomerEventOwnership,
  getAdminCustomerAccountsSnapshot,
  deleteAdminEventByPageSlug,
  deleteComment,
  getAllClientPasswords,
  getAllComments,
  getAllManagedInvitationPages,
  getAllMemoryPages,
  getCommentSummary,
  setClientPassword,
  setInvitationPagePublished,
  setInvitationPageProductTier,
  setInvitationPageVariantAvailability,
  type AdminCustomerAccountSummary,
  type AdminCustomerLinkedEventSummary,
  type ClientPassword,
  type Comment,
  type CommentSummary,
  type InvitationPageSummary,
} from '@/services';
import type { InvitationProductTier } from '@/types/invitationPage';

import { isRecentComment, RECENT_COMMENT_DAYS, type AdminTab } from '../_components/adminPageUtils';

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

export function useAdminData({
  isAdminLoggedIn,
  activeTab,
  showToast,
  confirm,
}: UseAdminDataParams) {
  const [pages, setPages] = useState<InvitationPageSummary[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [clientPasswords, setClientPasswords] = useState<ClientPassword[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<AdminCustomerAccountSummary[]>([]);
  const [unassignedCustomerEvents, setUnassignedCustomerEvents] = useState<
    AdminCustomerLinkedEventSummary[]
  >([]);
  const [memoryPublicCount, setMemoryPublicCount] = useState(0);
  const [commentSummary, setCommentSummary] = useState<CommentSummary>({
    totalCount: 0,
    recentCount: 0,
  });

  const [pagesLoading, setPagesLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [passwordsLoading, setPasswordsLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [savingPasswordPageSlug, setSavingPasswordPageSlug] = useState<string | null>(null);
  const [updatingPublishedPageSlug, setUpdatingPublishedPageSlug] = useState<string | null>(null);
  const [updatingVariantToken, setUpdatingVariantToken] = useState<string | null>(null);
  const [updatingTierPageSlug, setUpdatingTierPageSlug] = useState<string | null>(null);
  const [deletingPageSlug, setDeletingPageSlug] = useState<string | null>(null);
  const [ownershipActionToken, setOwnershipActionToken] = useState<string | null>(null);

  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [passwordsLoaded, setPasswordsLoaded] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  const resetAll = useCallback(() => {
    setPages([]);
    setComments([]);
    setClientPasswords([]);
    setCustomerAccounts([]);
    setUnassignedCustomerEvents([]);
    setMemoryPublicCount(0);
    setCommentSummary({ totalCount: 0, recentCount: 0 });
    setPagesLoaded(false);
    setCommentsLoaded(false);
    setPasswordsLoaded(false);
    setAccountsLoaded(false);
  }, []);

  /* ── Fetch: pages + summary (unified) ── */

  const fetchSummarySources = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [nextPages, memoryPages, nextCommentSummary] = await Promise.all([
        getAllManagedInvitationPages(),
        getAllMemoryPages(),
        getCommentSummary(RECENT_COMMENT_DAYS),
      ]);

      setPages(nextPages);
      setPagesLoaded(true);
      writeAdminInvitationPreviewCache(nextPages);
      setMemoryPublicCount(
        memoryPages.filter((page) => page.enabled && page.visibility !== 'private').length
      );
      setCommentSummary(nextCommentSummary);
    } catch (fetchError) {
      console.error(fetchError);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const refreshPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const nextPages = await getAllManagedInvitationPages();
      setPages(nextPages);
      setPagesLoaded(true);
      writeAdminInvitationPreviewCache(nextPages);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({ title: '청첩장 목록을 불러오지 못했습니다.', tone: 'error' });
    } finally {
      setPagesLoading(false);
    }
  }, [showToast]);

  /* ── Fetch: comments ── */

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const nextComments = await getAllComments();
      setComments(nextComments);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({ title: '방명록을 불러오지 못했습니다.', tone: 'error' });
    } finally {
      setCommentsLoaded(true);
      setCommentsLoading(false);
    }
  }, [showToast]);

  /* ── Fetch: passwords ── */

  const fetchPasswords = useCallback(async () => {
    setPasswordsLoading(true);
    try {
      const sourcePages =
        pages.length > 0 ? pages : await getAllManagedInvitationPages();

      if (pages.length === 0 && sourcePages.length > 0) {
        setPages(sourcePages);
        setPagesLoaded(true);
        writeAdminInvitationPreviewCache(sourcePages);
      }

      const nextPasswords = await getAllClientPasswords();
      setClientPasswords(nextPasswords);
      setPasswordsLoaded(true);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({ title: '고객 비밀번호를 불러오지 못했습니다.', tone: 'error' });
    } finally {
      setPasswordsLoading(false);
    }
  }, [pages, showToast]);

  const fetchCustomerAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const snapshot = await getAdminCustomerAccountsSnapshot();
      setCustomerAccounts(snapshot.accounts);
      setUnassignedCustomerEvents(snapshot.unassignedEvents);
      setAccountsLoaded(true);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({ title: '고객 계정 목록을 불러오지 못했습니다.', tone: 'error' });
    } finally {
      setAccountsLoading(false);
    }
  }, [showToast]);

  /* ── Actions ── */

  const handleDeleteComment = useCallback(
    async (comment: Comment) => {
      const approved = await confirm({
        title: '이 댓글을 삭제할까요?',
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
        setComments((prev) =>
          prev.filter(
            (entry) =>
              !(
                entry.id === comment.id &&
                (entry.collectionName ?? 'comments') === (comment.collectionName ?? 'comments')
              )
          )
        );
        setCommentSummary((prev) => ({
          totalCount: Math.max(0, prev.totalCount - 1),
          recentCount: isRecentComment(comment.createdAt)
            ? Math.max(0, prev.recentCount - 1)
            : prev.recentCount,
        }));
        showToast({ title: '댓글을 삭제했습니다.', tone: 'success' });
      } catch (deleteError) {
        console.error(deleteError);
        showToast({ title: '댓글 삭제에 실패했습니다.', tone: 'error' });
      }
    },
    [confirm, showToast]
  );

  const handleDeletePage = useCallback(
    async (page: InvitationPageSummary) => {
      const approved = await confirm({
        title: '청첩장을 완전 삭제할까요?',
        description: `${page.displayName} 페이지와 이벤트 본문, 방명록, 링크 토큰, 비밀번호, 결제 이행 로그까지 모두 삭제합니다. 이 작업은 복구할 수 없습니다.`,
        confirmLabel: '완전 삭제',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      setDeletingPageSlug(page.slug);

      try {
        const deletedPageSlug = page.slug;
        const deletedComments = comments.filter(
          (comment) => comment.pageSlug === deletedPageSlug
        );
        const deletedRecentCommentCount = deletedComments.filter((comment) =>
          isRecentComment(comment.createdAt)
        ).length;

        const removeDeletedPageFromLocalState = () => {
          setPages((prev) => prev.filter((entry) => entry.slug !== deletedPageSlug));
          setComments((prev) =>
            prev.filter((entry) => entry.pageSlug !== deletedPageSlug)
          );
          setClientPasswords((prev) =>
            prev.filter((entry) => entry.pageSlug !== deletedPageSlug)
          );
        };

        await deleteAdminEventByPageSlug(deletedPageSlug);
        removeDeletedPageFromLocalState();
        await Promise.all([
          fetchSummarySources(),
          commentsLoaded ? fetchComments() : Promise.resolve(),
          passwordsLoaded ? fetchPasswords() : Promise.resolve(),
        ]);
        removeDeletedPageFromLocalState();
        setCommentSummary((prev) => ({
          totalCount: Math.max(0, prev.totalCount - deletedComments.length),
          recentCount: Math.max(0, prev.recentCount - deletedRecentCommentCount),
        }));
        showToast({ title: '청첩장을 완전 삭제했습니다.', tone: 'success' });
      } catch (error) {
        console.error(error);
        showToast({
          title: '청첩장 전체 삭제에 실패했습니다.',
          message:
            error instanceof Error ? error.message : '잠시 뒤 다시 시도해 주세요.',
          tone: 'error',
        });
      } finally {
        setDeletingPageSlug(null);
      }
    },
    [
      comments,
      commentsLoaded,
      confirm,
      fetchComments,
      fetchPasswords,
      fetchSummarySources,
      passwordsLoaded,
      showToast,
    ]
  );

  const handleSavePassword = useCallback(
    async (pageSlug: string, nextPassword: string) => {
      const pageName = pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug;
      const approved = await confirm({
        title: '비밀번호를 저장할까요?',
        description: `${pageName} 페이지의 고객 비밀번호를 변경하면 기존 비밀번호는 복구할 수 없습니다.`,
        confirmLabel: '저장',
        cancelLabel: '취소',
        tone: 'danger',
      });

      if (!approved) {
        return;
      }

      setSavingPasswordPageSlug(pageSlug);
      try {
        await setClientPassword(pageSlug, nextPassword);
        await fetchPasswords();
        showToast({ title: '고객 비밀번호를 저장했습니다.', tone: 'success' });
      } catch (saveError) {
        console.error(saveError);
        showToast({ title: '고객 비밀번호 저장에 실패했습니다.', tone: 'error' });
      } finally {
        setSavingPasswordPageSlug(null);
      }
    },
    [confirm, fetchPasswords, pages, showToast]
  );

  const handleAssignCustomerOwnership = useCallback(
    async (uid: string, pageSlug: string) => {
      const pageName = pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug;
      const approved = await confirm({
        title: '고객 계정에 청첩장을 연결할까요?',
        description: `${pageName} 청첩장을 선택한 고객 계정의 사용자 페이지에서 바로 관리할 수 있게 연결합니다.`,
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
        await Promise.all([fetchCustomerAccounts(), refreshPages()]);
        showToast({
          title: '고객 계정에 청첩장을 연결했습니다.',
          message: '이제 고객이 사용자 페이지에서 바로 수정 및 관리할 수 있습니다.',
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
    [confirm, fetchCustomerAccounts, pages, refreshPages, showToast]
  );

  const handleClearCustomerOwnership = useCallback(
    async (pageSlug: string) => {
      const pageName = pages.find((page) => page.slug === pageSlug)?.displayName ?? pageSlug;
      const approved = await confirm({
        title: '고객 계정 연결을 해제할까요?',
        description: `${pageName} 청첩장을 현재 고객 계정에서 분리합니다. 해제 후에는 고객 사용자 페이지에서 더 이상 보이지 않습니다.`,
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
        await Promise.all([fetchCustomerAccounts(), refreshPages()]);
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
    [confirm, fetchCustomerAccounts, pages, refreshPages, showToast]
  );

  const handleTogglePublished = useCallback(
    async (page: InvitationPageSummary, nextPublished: boolean) => {
      if (nextPublished === page.published) {
        return;
      }

      const approved = await confirm({
        title: nextPublished ? '페이지를 공개할까요?' : '페이지를 비공개로 전환할까요?',
        description: `${page.displayName} 페이지를 ${nextPublished ? '공개' : '비공개'} 상태로 변경합니다.`,
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
        await refreshPages();
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
    [confirm, refreshPages, showToast]
  );

  const handleEnableVariant = useCallback(
    async (page: InvitationPageSummary, variantKey: InvitationThemeKey) => {
      const variantLabel = getInvitationThemeAdminLabel(variantKey);
      const approved = await confirm({
        title: `${variantLabel} 디자인을 추가할까요?`,
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
        await refreshPages();
        showToast({
          title: `${variantLabel} 디자인을 추가했습니다.`,
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: `${variantLabel} 디자인 추가에 실패했습니다.`,
          tone: 'error',
        });
      } finally {
        setUpdatingVariantToken(null);
      }
    },
    [confirm, refreshPages, showToast]
  );

  const handleDisableVariant = useCallback(
    async (page: InvitationPageSummary, variantKey: InvitationThemeKey) => {
      const variantLabel = getInvitationThemeAdminLabel(variantKey);
      const availableVariantCount = Object.values(page.variants ?? {}).filter(
        (variant) => variant?.available === true
      ).length;

      if (availableVariantCount <= 1) {
        showToast({
          title: '최소 1개의 디자인은 유지해야 합니다.',
          tone: 'error',
        });
        return;
      }

      const approved = await confirm({
        title: `${variantLabel} 디자인을 삭제할까요?`,
        description: `${page.displayName} 페이지에서 ${variantLabel} 미리보기를 제거합니다.`,
        confirmLabel: '삭제',
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
        await refreshPages();
        showToast({
          title: `${variantLabel} 디자인을 삭제했습니다.`,
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({
          title: `${variantLabel} 디자인 삭제에 실패했습니다.`,
          tone: 'error',
        });
      } finally {
        setUpdatingVariantToken(null);
      }
    },
    [confirm, refreshPages, showToast]
  );

  const handleChangeTier = useCallback(
    async (page: InvitationPageSummary, nextTier: InvitationProductTier) => {
      if (nextTier === page.productTier) {
        return;
      }

      const approved = await confirm({
        title: '서비스 등급을 변경할까요?',
        description: `${page.displayName} 페이지의 서비스를 ${page.productTier.toUpperCase()} → ${nextTier.toUpperCase()}으로 변경합니다.`,
        confirmLabel: '변경',
        cancelLabel: '취소',
      });

      if (!approved) {
        return;
      }

      setUpdatingTierPageSlug(page.slug);

      try {
        await setInvitationPageProductTier(page.slug, nextTier);
        await refreshPages();
        showToast({
          title: `서비스를 ${nextTier.toUpperCase()}으로 변경했습니다.`,
          tone: 'success',
        });
      } catch (error) {
        console.error(error);
        showToast({ title: '서비스 변경에 실패했습니다.', tone: 'error' });
      } finally {
        setUpdatingTierPageSlug(null);
      }
    },
    [confirm, refreshPages, showToast]
  );

  const handleLogout = useCallback(() => {
    clearAdminInvitationPreviewCache();
    resetAll();
  }, [resetAll]);

  /* ── Auto-fetch effects ── */

  useEffect(() => {
    if (!isAdminLoggedIn) {
      resetAll();
      return;
    }

    void fetchSummarySources();
  }, [fetchSummarySources, isAdminLoggedIn, resetAll]);

  useEffect(() => {
    if (!isAdminLoggedIn || activeTab !== 'comments' || commentsLoading || commentsLoaded) {
      return;
    }

    void fetchComments();
  }, [activeTab, commentsLoaded, commentsLoading, fetchComments, isAdminLoggedIn]);

  useEffect(() => {
    if (!isAdminLoggedIn || activeTab !== 'pages' || summaryLoading || pagesLoading || pagesLoaded) {
      return;
    }

    void refreshPages();
  }, [activeTab, refreshPages, isAdminLoggedIn, pagesLoaded, pagesLoading, summaryLoading]);

  useEffect(() => {
    if (!isAdminLoggedIn || activeTab !== 'passwords' || passwordsLoading || passwordsLoaded) {
      return;
    }

    void fetchPasswords();
  }, [activeTab, fetchPasswords, isAdminLoggedIn, passwordsLoaded, passwordsLoading]);

  useEffect(() => {
    if (!isAdminLoggedIn || activeTab !== 'accounts' || accountsLoading || accountsLoaded) {
      return;
    }

    void fetchCustomerAccounts();
  }, [accountsLoaded, accountsLoading, activeTab, fetchCustomerAccounts, isAdminLoggedIn]);

  return {
    pages,
    comments,
    clientPasswords,
    customerAccounts,
    unassignedCustomerEvents,
    memoryPublicCount,
    commentSummary,

    pagesLoading,
    commentsLoading,
    summaryLoading,
    passwordsLoading,
    accountsLoading,
    savingPasswordPageSlug,
    updatingPublishedPageSlug,
    updatingVariantToken,
    updatingTierPageSlug,
    deletingPageSlug,
    ownershipActionToken,

    refreshPages,
    fetchComments,
    fetchPasswords,
    fetchCustomerAccounts,
    fetchSummarySources,

    handleDeleteComment,
    handleDeletePage,
    handleSavePassword,
    handleAssignCustomerOwnership,
    handleClearCustomerOwnership,
    handleTogglePublished,
    handleChangeTier,
    handleEnableVariant,
    handleDisableVariant,
    handleLogout,
  };
}
