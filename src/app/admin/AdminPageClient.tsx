'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { DisplayPeriodManager, ImageManager, MemoryPageManager } from '@/components/admin';
import { useAdmin } from '@/contexts';
import {
  clearAdminInvitationPreviewCache,
  writeAdminInvitationPreviewCache,
} from '@/lib/adminInvitationPreviewCache';
import {
  deleteComment,
  getAllClientPasswords,
  getAllComments,
  getAllInvitationPages,
  getAllMemoryPages,
  getCommentSummary,
  setClientPassword,
  syncClientPasswordAccess,
  type ClientPassword,
  type Comment,
  type CommentSummary,
  type InvitationPageSummary,
} from '@/services';

import {
  AdminClientPasswordsTab,
  AdminCommentsTab,
  AdminPagesTab,
  StatusBadge,
  SummaryCards,
  useAdminOverlay,
  type SummaryCardItem,
} from './_components';
import {
  COMMENTS_PER_PAGE,
  DUE_SOON_DAYS,
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  RECENT_COMMENT_DAYS,
  TOTAL_SHORTCUT_COUNT,
  getAvailableShortcuts,
  isRecentComment,
  numberFromParam,
  parseCommentAge,
  parsePageSort,
  parsePageStatus,
  parsePeriodFilter,
  parseShortcut,
  parseTab,
  type AdminTab,
} from './_components/adminPageUtils';
import styles from './page.module.css';

function isPageDueSoon(page: InvitationPageSummary) {
  if (
    !page.displayPeriodEnabled ||
    !page.displayPeriodStart ||
    !page.displayPeriodEnd
  ) {
    return false;
  }

  const now = new Date();
  const diffDays = Math.ceil(
    (page.displayPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    now >= page.displayPeriodStart &&
    now <= page.displayPeriodEnd &&
    diffDays <= DUE_SOON_DAYS
  );
}

function getTabLabel(tab: AdminTab) {
  switch (tab) {
    case 'pages':
      return '청첩장';
    case 'memory':
      return '추억 페이지';
    case 'images':
      return '이미지';
    case 'comments':
      return '방명록';
    case 'passwords':
      return '비밀번호';
    case 'periods':
      return '노출 기간';
    default:
      return '관리';
  }
}

export default function AdminPageClient() {
  const { adminUser, isAdminLoggedIn, isAdminLoading, login, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { confirm, showToast } = useAdminOverlay();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
  const [savingPasswordPageSlug, setSavingPasswordPageSlug] = useState<string | null>(
    null
  );

  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [passwordsLoaded, setPasswordsLoaded] = useState(false);

  const activeTab = parseTab(searchParams.get('tab'));
  const pageSearch = searchParams.get('pageQ') ?? '';
  const pageShortcutFilter = parseShortcut(searchParams.get('shortcut'));
  const pageStatusFilter = parsePageStatus(searchParams.get('pageStatus'));
  const pageSort = parsePageSort(searchParams.get('pageSort'));
  const commentSearch = searchParams.get('commentQ') ?? '';
  const selectedPageSlug = searchParams.get('commentPageSlug') ?? 'all';
  const commentAgeFilter = parseCommentAge(searchParams.get('commentAge'));
  const currentPage = numberFromParam(searchParams.get('commentPage'), 1);
  const periodStatusFilter = parsePeriodFilter(searchParams.get('periodStatus'));

  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    router.replace(
      `${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`,
      { scroll: false }
    );
  }, [pathname, router, searchParams]);

  const resetLoadedFlags = useCallback(() => {
    setPagesLoaded(false);
    setCommentsLoaded(false);
    setPasswordsLoaded(false);
  }, []);

  const fetchPages = useCallback(async () => {
    setPagesLoading(true);
    try {
      const nextPages = await getAllInvitationPages({ includeSeedFallback: true });
      setPages(nextPages);
      setPagesLoaded(true);
      writeAdminInvitationPreviewCache(nextPages);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({
        title: '청첩장 목록을 불러오지 못했습니다.',
        tone: 'error',
      });
    } finally {
      setPagesLoading(false);
    }
  }, [showToast]);

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const nextComments = await getAllComments();
      setComments(nextComments);
      setCommentsLoaded(true);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({
        title: '방명록을 불러오지 못했습니다.',
        tone: 'error',
      });
    } finally {
      setCommentsLoading(false);
    }
  }, [showToast]);

  const fetchPasswords = useCallback(async () => {
    setPasswordsLoading(true);
    try {
      await syncClientPasswordAccess();
      const nextPasswords = await getAllClientPasswords();
      setClientPasswords(nextPasswords);
      setPasswordsLoaded(true);
    } catch (fetchError) {
      console.error(fetchError);
      showToast({
        title: '고객 비밀번호를 불러오지 못했습니다.',
        tone: 'error',
      });
    } finally {
      setPasswordsLoading(false);
    }
  }, [showToast]);

  const fetchSummarySources = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const [nextPages, memoryPages, nextCommentSummary] = await Promise.all([
        getAllInvitationPages({ includeSeedFallback: true }),
        getAllMemoryPages(),
        getCommentSummary(RECENT_COMMENT_DAYS),
      ]);

      setPages(nextPages);
      setPagesLoaded(true);
      writeAdminInvitationPreviewCache(nextPages);
      setMemoryPublicCount(
        memoryPages.filter((page) => page.enabled && page.visibility !== 'private')
          .length
      );
      setCommentSummary(nextCommentSummary);
    } catch (fetchError) {
      console.error(fetchError);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const success = await login(email, password);
    if (!success) {
      setError('이메일 또는 비밀번호를 확인해 주세요.');
      return;
    }

    setError('');
    setPassword('');
    showToast({
      title: '관리자 로그인에 성공했습니다.',
      tone: 'success',
    });
  };

  const handleDeleteComment = async (comment: Comment) => {
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
              (entry.collectionName ?? 'comments') ===
                (comment.collectionName ?? 'comments')
            )
        )
      );
      setCommentSummary((prev) => ({
        totalCount: Math.max(0, prev.totalCount - 1),
        recentCount: isRecentComment(comment.createdAt)
          ? Math.max(0, prev.recentCount - 1)
          : prev.recentCount,
      }));
      showToast({
        title: '댓글을 삭제했습니다.',
        tone: 'success',
      });
    } catch (deleteError) {
      console.error(deleteError);
      showToast({
        title: '댓글 삭제에 실패했습니다.',
        tone: 'error',
      });
    }
  };

  const handleSavePassword = async (pageSlug: string, nextPassword: string) => {
    setSavingPasswordPageSlug(pageSlug);
    try {
      await setClientPassword(pageSlug, nextPassword);
      await fetchPasswords();
      showToast({
        title: '고객 비밀번호를 저장했습니다.',
        tone: 'success',
      });
    } catch (saveError) {
      console.error(saveError);
      showToast({
        title: '고객 비밀번호 저장에 실패했습니다.',
        tone: 'error',
      });
    } finally {
      setSavingPasswordPageSlug(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    clearAdminInvitationPreviewCache();
    setPages([]);
    setComments([]);
    setClientPasswords([]);
    setMemoryPublicCount(0);
    setCommentSummary({
      totalCount: 0,
      recentCount: 0,
    });
    setEmail('');
    setPassword('');
    setError('');
    resetLoadedFlags();
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (!isAdminLoggedIn) {
      setPages([]);
      setComments([]);
      setClientPasswords([]);
      setMemoryPublicCount(0);
      setCommentSummary({
        totalCount: 0,
        recentCount: 0,
      });
      resetLoadedFlags();
      return;
    }

    void fetchSummarySources();
    void syncClientPasswordAccess().catch((syncError) => {
      console.error(syncError);
    });
  }, [fetchSummarySources, isAdminLoggedIn, resetLoadedFlags]);

  useEffect(() => {
    if (!isAdminLoggedIn || activeTab !== 'comments' || commentsLoading || commentsLoaded) {
      return;
    }

    void fetchComments();
  }, [activeTab, commentsLoaded, commentsLoading, fetchComments, isAdminLoggedIn]);

  useEffect(() => {
    if (
      !isAdminLoggedIn ||
      activeTab !== 'pages' ||
      summaryLoading ||
      pagesLoading ||
      pagesLoaded
    ) {
      return;
    }

    void fetchPages();
  }, [activeTab, fetchPages, isAdminLoggedIn, pagesLoaded, pagesLoading, summaryLoading]);

  useEffect(() => {
    if (
      !isAdminLoggedIn ||
      activeTab !== 'passwords' ||
      passwordsLoading ||
      passwordsLoaded
    ) {
      return;
    }

    void fetchPasswords();
  }, [activeTab, fetchPasswords, isAdminLoggedIn, passwordsLoaded, passwordsLoading]);

  const filteredPages = useMemo(() => {
    return [...pages]
      .filter((page) => {
        const links = getAvailableShortcuts(page);
        const matchesSearch = `${page.displayName} ${page.slug} ${
          page.description ?? ''
        } ${page.venue ?? ''}`
          .toLowerCase()
          .includes(pageSearch.trim().toLowerCase());
        const matchesShortcut =
          pageShortcutFilter === 'all' ||
          links.some((link) => link.key === pageShortcutFilter);
        const matchesStatus =
          pageStatusFilter === 'all' ||
          (pageStatusFilter === 'complete' &&
            links.length === TOTAL_SHORTCUT_COUNT) ||
          (pageStatusFilter === 'partial' &&
            links.length > 0 &&
            links.length < TOTAL_SHORTCUT_COUNT) ||
          (pageStatusFilter === 'empty' && links.length === 0);

        return matchesSearch && matchesShortcut && matchesStatus;
      })
      .sort((left, right) => {
        if (pageSort === 'name') {
          return left.displayName.localeCompare(right.displayName, 'ko');
        }

        if (pageSort === 'coverage') {
          return (
            getAvailableShortcuts(right).length - getAvailableShortcuts(left).length
          );
        }

        return right.slug.localeCompare(left.slug, 'ko');
      });
  }, [pageSearch, pageShortcutFilter, pageSort, pageStatusFilter, pages]);

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      const matchesSearch = `${comment.author} ${comment.message} ${comment.pageSlug}`
        .toLowerCase()
        .includes(commentSearch.trim().toLowerCase());
      const matchesPage =
        selectedPageSlug === 'all' || comment.pageSlug === selectedPageSlug;
      const matchesAge =
        commentAgeFilter === 'all' || isRecentComment(comment.createdAt);
      return matchesSearch && matchesPage && matchesAge;
    });
  }, [commentAgeFilter, commentSearch, comments, selectedPageSlug]);

  const totalCommentPages = Math.max(
    1,
    Math.ceil(filteredComments.length / COMMENTS_PER_PAGE)
  );
  const normalizedCurrentPage = Math.min(currentPage, totalCommentPages);
  const currentComments = filteredComments.slice(
    (normalizedCurrentPage - 1) * COMMENTS_PER_PAGE,
    normalizedCurrentPage * COMMENTS_PER_PAGE
  );
  const pageNameMap = new Map(pages.map((page) => [page.slug, page.displayName]));
  const commentPageOptions = [
    ...new Set([
      ...pages.map((page) => page.slug),
      ...comments.map((comment) => comment.pageSlug),
    ]),
  ]
    .sort((left, right) =>
      (pageNameMap.get(left) ?? left).localeCompare(
        pageNameMap.get(right) ?? right,
        'ko'
      )
    )
    .map((slug) => ({
      value: slug,
      label: pageNameMap.get(slug) ? `${pageNameMap.get(slug)} (${slug})` : slug,
    }));

  useEffect(() => {
    if (currentPage !== normalizedCurrentPage) {
      updateQuery({ commentPage: String(normalizedCurrentPage) });
    }
  }, [currentPage, normalizedCurrentPage, updateQuery]);

  const invitationCount = pages.length;
  const restrictedCount = pages.filter((page) => page.displayPeriodEnabled).length;
  const dueSoonCount = pages.filter(isPageDueSoon).length;
  const recentCommentsCount = commentSummary.recentCount;

  const summaryCards: SummaryCardItem[] = [
    {
      id: 'invitations',
      label: '청첩장 페이지',
      value: invitationCount,
      meta:
        restrictedCount > 0
          ? `기간 제한 사용 ${restrictedCount}개`
          : '현재 기간 제한이 설정된 페이지가 없습니다.',
      tone: invitationCount > 0 ? 'success' : 'neutral',
      onClick: () => updateQuery({ tab: 'pages' }),
    },
    {
      id: 'dueSoon',
      label: '곧 종료',
      value: dueSoonCount,
      meta:
        dueSoonCount > 0
          ? `${DUE_SOON_DAYS}일 이내 종료되는 청첩장`
          : '긴급히 확인할 청첩장이 없습니다.',
      tone: dueSoonCount > 0 ? 'warning' : 'neutral',
      onClick: () => updateQuery({ tab: 'periods', periodStatus: 'dueSoon' }),
    },
    {
      id: 'recentComments',
      label: '최근 댓글',
      value: recentCommentsCount,
      meta:
        recentCommentsCount > 0
          ? `최근 ${RECENT_COMMENT_DAYS}일 이내 등록된 댓글`
          : '최근 댓글이 없습니다.',
      tone: recentCommentsCount > 0 ? 'primary' : 'neutral',
      onClick: () =>
        updateQuery({ tab: 'comments', commentAge: 'recent', commentPage: '1' }),
    },
    {
      id: 'memoryVisible',
      label: '공개 추억 페이지',
      value: memoryPublicCount,
      meta: `청첩장 ${invitationCount}개와 별도로 운영됩니다.`,
      tone: memoryPublicCount > 0 ? 'primary' : 'neutral',
      onClick: () => updateQuery({ tab: 'memory' }),
    },
  ];

  const pageFilterChips = [
    pageSearch
      ? {
          id: 'page-search',
          label: `검색: ${pageSearch}`,
          onRemove: () => updateQuery({ pageQ: null }),
        }
      : null,
    pageShortcutFilter !== 'all'
      ? {
          id: 'page-shortcut',
          label: `테마: ${pageShortcutFilter}`,
          onRemove: () => updateQuery({ shortcut: null }),
        }
      : null,
    pageStatusFilter !== 'all'
      ? {
          id: 'page-status',
          label: `상태: ${PAGE_STATUS_LABELS[pageStatusFilter]}`,
          onRemove: () => updateQuery({ pageStatus: null }),
        }
      : null,
    pageSort !== 'newest'
      ? {
          id: 'page-sort',
          label: `정렬: ${PAGE_SORT_LABELS[pageSort]}`,
          onRemove: () => updateQuery({ pageSort: null }),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onRemove: () => void }>;

  const commentFilterChips = [
    commentSearch
      ? {
          id: 'comment-search',
          label: `검색: ${commentSearch}`,
          onRemove: () => updateQuery({ commentQ: null, commentPage: '1' }),
        }
      : null,
    selectedPageSlug !== 'all'
      ? {
          id: 'comment-page',
          label: `페이지: ${selectedPageSlug}`,
          onRemove: () =>
            updateQuery({ commentPageSlug: null, commentPage: '1' }),
        }
      : null,
    commentAgeFilter !== 'all'
      ? {
          id: 'comment-age',
          label: `기간: 최근 ${RECENT_COMMENT_DAYS}일`,
          onRemove: () => updateQuery({ commentAge: null, commentPage: '1' }),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onRemove: () => void }>;

  const activeTabLabel = getTabLabel(activeTab);

  if (isAdminLoading) {
    return <div className={styles.container} />;
  }

  if (!isAdminLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.loginShell}>
          <a className="admin-button admin-button-ghost" href="/">
            메인으로 돌아가기
          </a>
          <div className={styles.loginCard}>
            <StatusBadge tone="neutral">Admin Access</StatusBadge>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>관리자 로그인</h1>
              <p className={styles.loginDescription}>
                Firebase Auth 관리자 계정으로만 로그인할 수 있습니다.
              </p>
            </div>
            <form className={styles.loginForm} onSubmit={handleLogin}>
              <label className="admin-field">
                <span className="admin-field-label">Email</span>
                <input
                  className="admin-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="admin-field">
                <span className="admin-field-label">Password</span>
                <input
                  className="admin-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {error ? <p className={styles.errorBanner}>{error}</p> : null}
              <button className="admin-button admin-button-primary" type="submit">
                로그인
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div className={styles.headerTopRow}>
            <a className="admin-button admin-button-ghost" href="/">
              메인으로 돌아가기
            </a>
            <div className={styles.headerActions}>
              <StatusBadge tone="success">{adminUser?.email ?? 'Admin'}</StatusBadge>
              <button
                className="admin-button admin-button-secondary"
                onClick={() => void handleLogout()}
                type="button"
              >
                로그아웃
              </button>
            </div>
          </div>

          <div className={styles.headerMain}>
            <div className={styles.headingBlock}>
              <span className={styles.pageEyebrow}>Invitation Admin</span>
              <h1 className={styles.pageTitle}>운영 대시보드</h1>
              <p className={styles.pageDescription}>
                청첩장 공개 상태, 방명록, 이미지, 고객 비밀번호, 추억 페이지, 노출
                기간을 한 화면에서 관리합니다.
              </p>
            </div>
            <div className={styles.headerSummary}>
              <StatusBadge tone="primary">{activeTabLabel}</StatusBadge>
              <p className={styles.headerSummaryText}>
                현재 탭에 필요한 범위만 조회합니다.
              </p>
            </div>
          </div>
        </header>

        <SummaryCards items={summaryCards} />

        <nav className={styles.tabBar} aria-label="관리 탭">
          {(
            ['pages', 'memory', 'images', 'comments', 'passwords', 'periods'] as AdminTab[]
          ).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              className={`${styles.tabButton} ${
                activeTab === tabKey ? styles.tabButtonActive : ''
              }`}
              onClick={() =>
                updateQuery({
                  tab: tabKey === 'pages' ? null : tabKey,
                })
              }
            >
              {getTabLabel(tabKey)}
            </button>
          ))}
        </nav>

        <section className={styles.panel}>
          {activeTab === 'pages' ? (
            <AdminPagesTab
              loading={pagesLoading}
              summaryLoading={summaryLoading}
              weddingPages={pages}
              filteredPages={filteredPages}
              pageSearch={pageSearch}
              pageShortcutFilter={pageShortcutFilter}
              pageStatusFilter={pageStatusFilter}
              pageSort={pageSort}
              chips={pageFilterChips}
              onQueryChange={updateQuery}
              onRefresh={() => void fetchPages()}
            />
          ) : null}

          {activeTab === 'memory' ? <MemoryPageManager /> : null}
          {activeTab === 'images' ? <ImageManager /> : null}

          {activeTab === 'comments' ? (
            <AdminCommentsTab
              commentsLoading={commentsLoading}
              comments={comments}
              filteredComments={filteredComments}
              currentComments={currentComments}
              currentPage={normalizedCurrentPage}
              totalPages={totalCommentPages}
              commentSearch={commentSearch}
              selectedPageSlug={selectedPageSlug}
              commentAgeFilter={commentAgeFilter}
              chips={commentFilterChips}
              commentPageOptions={commentPageOptions}
              onRefresh={() => void fetchComments()}
              onQueryChange={updateQuery}
              onDeleteComment={(comment) => void handleDeleteComment(comment)}
            />
          ) : null}

          {activeTab === 'passwords' ? (
            <AdminClientPasswordsTab
              loading={passwordsLoading}
              pages={pages}
              passwords={clientPasswords}
              savingPageSlug={savingPasswordPageSlug}
              onRefresh={() => void fetchPasswords()}
              onSave={(pageSlug, nextPassword) =>
                void handleSavePassword(pageSlug, nextPassword)
              }
            />
          ) : null}

          {activeTab === 'periods' ? (
            <DisplayPeriodManager
              isVisible={true}
              statusFilter={periodStatusFilter}
              onDataChanged={() => void fetchSummarySources()}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
