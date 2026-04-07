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
  deleteComment,
  getAllClientPasswords,
  getAllComments,
  getAllManagedInvitationPages,
  getAllMemoryPages,
  getCommentSummary,
  setClientPassword,
  setInvitationPageVariantAvailability,
  syncClientPasswordAccess,
  type ClientPassword,
  type Comment,
  type CommentSummary,
  type InvitationPageSummary,
} from '@/services';

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
  const [memoryPublicCount, setMemoryPublicCount] = useState(0);
  const [commentSummary, setCommentSummary] = useState<CommentSummary>({
    totalCount: 0,
    recentCount: 0,
  });

  const [pagesLoading, setPagesLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [passwordsLoading, setPasswordsLoading] = useState(false);
  const [savingPasswordPageSlug, setSavingPasswordPageSlug] = useState<string | null>(null);
  const [updatingVariantToken, setUpdatingVariantToken] = useState<string | null>(null);

  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [passwordsLoaded, setPasswordsLoaded] = useState(false);

  const resetAll = useCallback(() => {
    setPages([]);
    setComments([]);
    setClientPasswords([]);
    setMemoryPublicCount(0);
    setCommentSummary({ totalCount: 0, recentCount: 0 });
    setPagesLoaded(false);
    setCommentsLoaded(false);
    setPasswordsLoaded(false);
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
      await syncClientPasswordAccess();
      const nextPasswords = await getAllClientPasswords();
      setClientPasswords(nextPasswords);
      setPasswordsLoaded(true);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({ title: '고객 비밀번호를 불러오지 못했습니다.', tone: 'error' });
    } finally {
      setPasswordsLoading(false);
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
    void syncClientPasswordAccess().catch((syncError) => {
      console.error(syncError);
    });
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

  return {
    pages,
    comments,
    clientPasswords,
    memoryPublicCount,
    commentSummary,

    pagesLoading,
    commentsLoading,
    summaryLoading,
    passwordsLoading,
    savingPasswordPageSlug,
    updatingVariantToken,

    refreshPages,
    fetchComments,
    fetchPasswords,
    fetchSummarySources,

    handleDeleteComment,
    handleSavePassword,
    handleEnableVariant,
    handleLogout,
  };
}
