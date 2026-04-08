'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { DisplayPeriodManager, ImageManager, MemoryPageManager } from '@/components/admin';
import { useAdmin } from '@/contexts';
import type { InvitationPageSummary } from '@/services';

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
import { useAdminData } from './_hooks/useAdminData';
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
        title: '청첩장별 추억 페이지 청첩장과 연결 데이터를 불러옵니다.',
        description: '청첩장을 고르면 청첩장, 댓글, 이미지 상태를 한 번에 이어서 관리할 수 있습니다.',
        helper: '핵심 작업: 청첩장 확인 및 공개 상태 조정',
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
  const safePathname = pathname ?? '/admin';
  const searchParams = useSearchParams();
  const safeSearchParams = searchParams ?? new URLSearchParams();
  const { confirm, showToast } = useAdminOverlay();

  /* ── Login form state ── */

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  /* ── URL query ── */

  const activeTab = parseTab(safeSearchParams.get('tab'));
  const pageSearch = safeSearchParams.get('pageQ') ?? '';
  const pageShortcutFilter = parseShortcut(safeSearchParams.get('shortcut'));
  const pageStatusFilter = parsePageStatus(safeSearchParams.get('pageStatus'));
  const pageSort = parsePageSort(safeSearchParams.get('pageSort'));
  const commentSearch = safeSearchParams.get('commentQ') ?? '';
  const selectedPageSlug = safeSearchParams.get('commentPageSlug') ?? 'all';
  const commentAgeFilter = parseCommentAge(safeSearchParams.get('commentAge'));
  const currentPage = numberFromParam(safeSearchParams.get('commentPage'), 1);
  const periodStatusFilter = parsePeriodFilter(safeSearchParams.get('periodStatus'));

  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(safeSearchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    router.replace(
      `${safePathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`,
      { scroll: false }
    );
  }, [router, safePathname, safeSearchParams]);

  /* ── Data layer ── */

  const {
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
    updatingPublishedPageSlug,
    updatingVariantToken,
    refreshPages,
    fetchComments,
    fetchPasswords,
    fetchSummarySources,
    handleDeleteComment,
    handleSavePassword,
    handleTogglePublished,
    handleEnableVariant,
    handleDisableVariant,
    handleLogout: dataLogout,
  } = useAdminData({ isAdminLoggedIn, activeTab, showToast, confirm });

  /* ── Handlers ── */

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setLoginLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (!success) {
        setError('이메일 또는 비밀번호를 확인해 주세요.');
        return;
      }

      setPassword('');
      showToast({
        title: '관리자 로그인에 성공했습니다.',
        tone: 'success',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    dataLogout();
    setEmail('');
    setPassword('');
    setError('');
    router.replace(safePathname, { scroll: false });
  };

  /* ── Filtered / sorted views ── */

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

        const rightCreatedAt = right.createdAt?.getTime() ?? 0;
        const leftCreatedAt = left.createdAt?.getTime() ?? 0;
        if (rightCreatedAt !== leftCreatedAt) {
          return rightCreatedAt - leftCreatedAt;
        }

        const rightUpdatedAt = right.updatedAt?.getTime() ?? 0;
        const leftUpdatedAt = left.updatedAt?.getTime() ?? 0;
        if (rightUpdatedAt !== leftUpdatedAt) {
          return rightUpdatedAt - leftUpdatedAt;
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

  const pageNameMap = useMemo(
    () => new Map(pages.map((page) => [page.slug, page.displayName])),
    [pages]
  );

  const commentPageOptions = useMemo(() => {
    return [
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
  }, [comments, pageNameMap, pages]);

  useEffect(() => {
    if (currentPage !== normalizedCurrentPage) {
      updateQuery({ commentPage: String(normalizedCurrentPage) });
    }
  }, [currentPage, normalizedCurrentPage, updateQuery]);

  /* ── Summary cards ── */

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

  /* ── Filter chips ── */

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

  /* ── Render ── */

  if (isAdminLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loginShell}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>관리자 인증을 확인하고 있습니다.</p>
          </div>
        </div>
      </div>
    );
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
              <button
                className="admin-button admin-button-primary"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? '로그인 중...' : '로그인'}
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

        <div className={styles.tabBar} role="tablist" aria-label="관리 탭">
          {(
            ['pages', 'memory', 'images', 'comments', 'passwords', 'periods'] as AdminTab[]
          ).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={activeTab === tabKey}
              aria-controls={`panel-${tabKey}`}
              id={`tab-${tabKey}`}
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
        </div>

        <section
          className={styles.panel}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
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
              onRefresh={() => void refreshPages()}
              onTogglePublished={(page, nextPublished) =>
                void handleTogglePublished(page, nextPublished)
              }
              onEnableVariant={(page, variantKey) =>
                void handleEnableVariant(page, variantKey)
              }
              onDisableVariant={(page, variantKey) =>
                void handleDisableVariant(page, variantKey)
              }
              updatingPublishedPageSlug={updatingPublishedPageSlug}
              updatingVariantToken={updatingVariantToken}
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
