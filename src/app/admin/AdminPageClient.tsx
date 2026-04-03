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
  createInvitationPageDraftFromSeed,
  deleteComment,
  getAllClientPasswords,
  getAllComments,
  getAllManagedInvitationPages,
  getAllMemoryPages,
  getInvitationPageSeedTemplates,
  getCommentSummary,
  setClientPassword,
  syncClientPasswordAccess,
  type ClientPassword,
  type Comment,
  type CommentSummary,
  type InvitationPageSeedTemplate,
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

function getTabSummary(tab: AdminTab) {
  switch (tab) {
    case 'pages':
      return {
        title: '청첩장 공개 상태와 연결 상태를 바로 확인합니다.',
        description: '공개 여부, 테마 연결, 데이터 기준을 보고 곧바로 편집기로 이동할 수 있습니다.',
        helper: '핵심 작업: 청첩장 편집',
      };
    case 'memory':
      return {
        title: '청첩장별 추억 페이지 초안과 연결 데이터를 불러옵니다.',
        description: '청첩장을 고르면 초안, 댓글, 이미지 상태를 한 번에 이어서 관리할 수 있습니다.',
        helper: '핵심 작업: 초안 확인 및 공개 상태 조정',
      };
    case 'images':
      return {
        title: '선택한 청첩장의 이미지를 업로드하고 교체합니다.',
        description: '페이지를 고른 뒤 현재 이미지 목록을 확인하고 새 이미지를 추가하거나 삭제할 수 있습니다.',
        helper: '핵심 작업: 이미지 업로드',
      };
    case 'comments':
      return {
        title: '검색과 필터로 댓글을 찾고 삭제할 수 있습니다.',
        description: '페이지, 기간, 검색어 기준으로 방명록을 좁혀 보고 필요한 댓글만 빠르게 정리합니다.',
        helper: '핵심 작업: 댓글 검토 및 삭제',
      };
    case 'passwords':
      return {
        title: '페이지별 고객 비밀번호를 저장하고 편집기로 이동합니다.',
        description: '기본은 숨김 상태로 관리되며, 저장 완료 여부를 확인한 뒤 편집기로 안전하게 열 수 있습니다.',
        helper: '핵심 작업: 비밀번호 저장',
      };
    case 'periods':
      return {
        title: '공개 기간을 설정하고 만료 상태를 관리합니다.',
        description: '곧 종료, 노출 중, 만료 상태를 비교하면서 기간 제한을 바로 수정하거나 해제할 수 있습니다.',
        helper: '핵심 작업: 노출 기간 점검',
      };
    default:
      return {
        title: '현재 탭에 맞는 관리 작업을 진행합니다.',
        description: '필요한 범위만 불러와 빠르게 운영 작업을 이어갈 수 있습니다.',
        helper: '핵심 작업: 관리',
      };
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
  const seedTemplates = useMemo<InvitationPageSeedTemplate[]>(
    () => getInvitationPageSeedTemplates(),
    []
  );
  const [createSeedSlug, setCreateSeedSlug] = useState(seedTemplates[0]?.slug ?? '');
  const [createSlugBase, setCreateSlugBase] = useState(seedTemplates[0]?.slug ?? '');
  const [createGroomName, setCreateGroomName] = useState(seedTemplates[0]?.groomName ?? '');
  const [createBrideName, setCreateBrideName] = useState(seedTemplates[0]?.brideName ?? '');
  const [creatingPage, setCreatingPage] = useState(false);

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
      const nextPages = await getAllManagedInvitationPages();
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
    } catch (fetchError) {
      console.error(fetchError);
      showToast({
        title: '방명록을 불러오지 못했습니다.',
        tone: 'error',
      });
    } finally {
      setCommentsLoaded(true);
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
        getAllManagedInvitationPages(),
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

  const applyCreateTemplate = useCallback(
    (seedSlug: string) => {
      const template =
        seedTemplates.find((entry) => entry.slug === seedSlug) ?? seedTemplates[0] ?? null;
      if (!template) {
        return;
      }

      setCreateSeedSlug(template.slug);
      setCreateSlugBase(template.slug);
      setCreateGroomName(template.groomName);
      setCreateBrideName(template.brideName);
    },
    [seedTemplates]
  );

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

  const handleCreatePage = async () => {
    if (!createSeedSlug) {
      showToast({
        title: '초기 템플릿을 먼저 선택해 주세요.',
        tone: 'error',
      });
      return;
    }

    if (!createSlugBase.trim() || !createGroomName.trim() || !createBrideName.trim()) {
      showToast({
        title: 'URL 기본값과 신랑·신부 이름을 모두 입력해 주세요.',
        tone: 'error',
      });
      return;
    }

    setCreatingPage(true);

    try {
      const created = await createInvitationPageDraftFromSeed({
        seedSlug: createSeedSlug,
        slugBase: createSlugBase,
        groomName: createGroomName,
        brideName: createBrideName,
        published: false,
      });

      await fetchSummarySources();
      showToast({
        title: '새 페이지 초안을 만들었습니다.',
        message: `${created.slug}`,
        tone: 'success',
      });

      if (typeof window !== 'undefined') {
        window.open(`/page-editor/${created.slug}`, '_blank', 'noopener,noreferrer');
      }
    } catch (createError) {
      console.error(createError);
      showToast({
        title: '새 페이지를 만들지 못했습니다.',
        tone: 'error',
      });
    } finally {
      setCreatingPage(false);
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
    if (activeTab !== 'comments') {
      setCommentsLoaded(false);
      return;
    }

    if (!isAdminLoggedIn || commentsLoading || commentsLoaded) {
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
      actionLabel: '청첩장 관리 열기',
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
      actionLabel: '노출 기간 보기',
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
      actionLabel: '방명록 열기',
      onClick: () =>
        updateQuery({ tab: 'comments', commentAge: 'recent', commentPage: '1' }),
    },
    {
      id: 'memoryVisible',
      label: '공개 추억 페이지',
      value: memoryPublicCount,
      meta: `청첩장 ${invitationCount}개와 별도로 운영됩니다.`,
      tone: memoryPublicCount > 0 ? 'primary' : 'neutral',
      actionLabel: '추억 페이지 열기',
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
  const activeTabSummary = getTabSummary(activeTab);

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
              <strong className={styles.headerSummaryTitle}>
                {activeTabSummary.title}
              </strong>
              <p className={styles.headerSummaryText}>{activeTabSummary.description}</p>
              <p className={styles.headerSummaryMeta}>{activeTabSummary.helper}</p>
              <p className={styles.headerSummaryLegacy}>
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
              seedTemplates={seedTemplates}
              createSeedSlug={createSeedSlug}
              createSlugBase={createSlugBase}
              createGroomName={createGroomName}
              createBrideName={createBrideName}
              creatingPage={creatingPage}
              onCreateSeedSlugChange={applyCreateTemplate}
              onCreateSlugBaseChange={setCreateSlugBase}
              onCreateGroomNameChange={setCreateGroomName}
              onCreateBrideNameChange={setCreateBrideName}
              onCreatePage={() => void handleCreatePage()}
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
