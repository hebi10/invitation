'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { DisplayPeriodManager, ImageManager, MemoryPageManager } from '@/components/admin';
import { useAdmin } from '@/contexts';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { AdminOwnershipInviteResult } from '@/services/eventOwnershipInviteService';

import {
  AdminCommentsTab,
  AdminCustomerAccountsTab,
  AdminOwnershipInviteDialog,
  AdminPagesTab,
  AdminShell,
  StatusBadge,
  useAdminOverlay,
} from './_components';
import {
  COMMENTS_PER_PAGE,
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  RECENT_COMMENT_DAYS,
  TOTAL_SHORTCUT_COUNT,
  getDefaultTabForSection,
  getAvailableShortcuts,
  getPageCategoryEventTypeFilter,
  getSectionForTab,
  getTabsForSection,
  isRecentComment,
  numberFromParam,
  parseAdminPrimaryView,
  parseCommentAge,
  parsePageCategory,
  parsePageSort,
  parsePageStatus,
  parsePageEventType,
  parsePeriodFilter,
  parseSection,
  parseShortcut,
  parseTab,
} from './_components/adminPageUtils';
import { useAdminData } from './_hooks/useAdminData';
import styles from './page.module.css';

const PRIMARY_VIEW_QUERY = {
  events: { section: 'events', tab: 'pages' },
  comments: { section: 'events', tab: 'comments' },
  customers: { section: 'customers', tab: 'accounts' },
} as const;

export default function AdminPageClient() {
  const { adminUser, isAdminLoggedIn, isAdminLoading, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? '/admin';
  const searchParams = useSearchParams();
  const safeSearchParams = useMemo(
    () => searchParams ?? new URLSearchParams(),
    [searchParams]
  );
  const returnPath = (() => {
    const value = safeSearchParams.get('next');
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return null;
    }

    return value;
  })();
  const { confirm, showToast } = useAdminOverlay();
  const [ownershipInvite, setOwnershipInvite] =
    useState<AdminOwnershipInviteResult | null>(null);

  /* ── URL query ── */

  const requestedTabParam = safeSearchParams.get('tab');
  const requestedSectionParam = safeSearchParams.get('section');
  const requestedPageCategoryParam = safeSearchParams.get('pageCategory');
  const requestedTab = parseTab(requestedTabParam);
  const requestedSection = requestedSectionParam;
  const activePageCategory = parsePageCategory(requestedPageCategoryParam);
  const activeSection = requestedSection
    ? parseSection(requestedSection)
    : getSectionForTab(requestedTab);
  const sectionTabs = getTabsForSection(activeSection, activePageCategory);
  const activeTab = sectionTabs.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : getDefaultTabForSection(activeSection, activePageCategory);
  const activePrimaryView = parseAdminPrimaryView(activeTab);
  const pageSearch = safeSearchParams.get('pageQ') ?? '';
  const pageEventTypeFilter = parsePageEventType(safeSearchParams.get('pageType'));
  const pageShortcutFilter = parseShortcut(safeSearchParams.get('shortcut'));
  const pageStatusFilter = parsePageStatus(safeSearchParams.get('pageStatus'));
  const pageSort = parsePageSort(safeSearchParams.get('pageSort'));
  const commentSearch = safeSearchParams.get('commentQ') ?? '';
  const selectedPageSlug = safeSearchParams.get('commentPageSlug') ?? 'all';
  const commentAgeFilter = parseCommentAge(safeSearchParams.get('commentAge'));
  const currentPage = numberFromParam(safeSearchParams.get('commentPage'), 1);
  const periodStatusFilter = parsePeriodFilter(safeSearchParams.get('periodStatus'));
  const activePageCategoryEventType = getPageCategoryEventTypeFilter(activePageCategory);

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
    customerAccounts,
    unassignedCustomerEvents,
    pagesLoading,
    pagesRefreshing,
    commentsLoading,
    commentsRefreshing,
    summaryLoading,
    accountsLoading,
    accountsRefreshing,
    updatingPublishedPageSlug,
    updatingVariantToken,
    updatingTierPageSlug,
    deletingPageSlug,
    deletingCustomerUid,
    ownershipActionToken,
    issuingOwnershipInviteSlug,
    walletGrantActionToken,
    refreshPages,
    fetchComments,
    fetchCustomerAccounts,
    fetchSummarySources,
    handleDeleteComment,
    handleDeletePage,
    handleAssignCustomerOwnership,
    handleClearCustomerOwnership,
    handleIssueOwnershipInvite,
    handleGrantCustomerWalletCredit,
    handleDeleteCustomerAccount,
    handleTogglePublished,
    handleChangeTier,
    handleEnableVariant,
    handleDisableVariant,
    handleLogout: dataLogout,
  } = useAdminData({ isAdminLoggedIn, activeTab, showToast, confirm });

  /* ── Handlers ── */

  const handleLogout = async () => {
    await logout();
    dataLogout();
    router.replace(safePathname, { scroll: false });
  };

  const issueOwnershipInviteAndOpen = async (pageSlug: string) => {
    const result = await handleIssueOwnershipInvite(pageSlug);
    if (result) {
      setOwnershipInvite(result);
    }
  };

  const reissueOwnershipInvite = async () => {
    if (!ownershipInvite) {
      return;
    }

    const approved = await confirm({
      title: '고객 연결 링크를 다시 만들까요?',
      description: '기존 링크는 즉시 사용할 수 없게 되고 새로 만든 링크만 유효합니다.',
      confirmLabel: '재발급',
      cancelLabel: '취소',
    });
    if (!approved) {
      return;
    }

    const result = await handleIssueOwnershipInvite(ownershipInvite.slug);
    if (result) {
      setOwnershipInvite(result);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn && returnPath) {
      router.replace(returnPath, { scroll: false });
    }
  }, [isAdminLoggedIn, returnPath, router]);

  useEffect(() => {
    const needsCanonicalSection = requestedSectionParam !== activeSection;
    const needsCanonicalTab = requestedTabParam !== activeTab;
    const needsCanonicalPageCategory =
      activeSection === 'events' && requestedPageCategoryParam !== activePageCategory;

    if (!needsCanonicalSection && !needsCanonicalTab && !needsCanonicalPageCategory) {
      return;
    }

    const nextParams = new URLSearchParams(safeSearchParams.toString());
    nextParams.set('section', activeSection);
    nextParams.set('tab', activeTab);
    if (activeSection === 'events') {
      nextParams.set('pageCategory', activePageCategory);
    }

    router.replace(
      `${safePathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`,
      { scroll: false }
    );
  }, [
    activePageCategory,
    activeSection,
    activeTab,
    requestedPageCategoryParam,
    requestedSectionParam,
    requestedTabParam,
    router,
    safePathname,
    safeSearchParams,
  ]);

  /* ── Filtered / sorted views ── */

  const filteredPages = useMemo(() => {
    return [...pages]
      .filter((page) => {
        const links = getAvailableShortcuts(page);
        const matchesPageCategory =
          !activePageCategoryEventType || page.eventType === activePageCategoryEventType;
        const matchesSearch = `${page.displayName} ${page.slug} ${
          page.description ?? ''
        } ${page.venue ?? ''} ${getEventTypeDisplayLabel(page.eventType)}`
          .toLowerCase()
          .includes(pageSearch.trim().toLowerCase());
        const matchesEventType =
          pageEventTypeFilter === 'all' || page.eventType === pageEventTypeFilter;
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

        return (
          matchesPageCategory &&
          matchesSearch &&
          matchesEventType &&
          matchesShortcut &&
          matchesStatus
        );
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
  }, [
    activePageCategoryEventType,
    pageEventTypeFilter,
    pageSearch,
    pageShortcutFilter,
    pageSort,
    pageStatusFilter,
    pages,
  ]);

  const categoryPages = useMemo(() => {
    if (!activePageCategoryEventType) {
      return [];
    }

    return pages.filter((page) => page.eventType === activePageCategoryEventType);
  }, [activePageCategoryEventType, pages]);

  const categoryPageSlugs = useMemo(
    () => new Set(categoryPages.map((page) => page.slug)),
    [categoryPages]
  );

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      const matchesPageCategory =
        !activePageCategoryEventType || categoryPageSlugs.has(comment.pageSlug);
      const matchesSearch = `${comment.author} ${comment.message} ${comment.pageSlug}`
        .toLowerCase()
        .includes(commentSearch.trim().toLowerCase());
      const matchesPage =
        selectedPageSlug === 'all' || comment.pageSlug === selectedPageSlug;
      const matchesAge =
        commentAgeFilter === 'all' || isRecentComment(comment.createdAt);
      return matchesPageCategory && matchesSearch && matchesPage && matchesAge;
    });
  }, [
    activePageCategoryEventType,
    categoryPageSlugs,
    commentAgeFilter,
    commentSearch,
    comments,
    selectedPageSlug,
  ]);

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
    () => new Map(categoryPages.map((page) => [page.slug, page.displayName])),
    [categoryPages]
  );

  const commentPageOptions = useMemo(() => {
    const categoryCommentPageSlugs = comments
      .map((comment) => comment.pageSlug)
      .filter((pageSlug) => !activePageCategoryEventType || categoryPageSlugs.has(pageSlug));

    return [
      ...new Set([
        ...categoryPages.map((page) => page.slug),
        ...categoryCommentPageSlugs,
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
  }, [
    activePageCategoryEventType,
    categoryPageSlugs,
    categoryPages,
    comments,
    pageNameMap,
  ]);

  useEffect(() => {
    if (currentPage !== normalizedCurrentPage) {
      updateQuery({ commentPage: String(normalizedCurrentPage) });
    }
  }, [currentPage, normalizedCurrentPage, updateQuery]);

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
    pageEventTypeFilter !== 'all'
      ? {
          id: 'page-type',
          label: `이벤트: ${getEventTypeDisplayLabel(pageEventTypeFilter)}`,
          onRemove: () => updateQuery({ pageType: null }),
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
          <div className={styles.headerActions}>
            <a className="admin-button admin-button-ghost" href="/">
              메인으로 돌아가기
            </a>
            <a
              className="admin-button admin-button-secondary"
              href="/my-invitations"
              target="_blank"
              rel="noreferrer"
            >
              사용자 페이지
            </a>
          </div>
          <div className={styles.loginCard}>
            <StatusBadge tone="neutral">Admin Access</StatusBadge>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>관리자 로그인</h1>
              <p className={styles.loginDescription}>
                Firebase Auth 관리자 계정으로만 로그인할 수 있습니다.
              </p>
            </div>
            <FirebaseAuthLoginCard
              title="관리자 로그인"
              description="Firebase Authentication으로 로그인한 뒤 관리자 권한이 있는 계정만 관리자 화면에 접근할 수 있습니다."
              helperText="기본 이메일 로그인과 Google 로그인만 지원합니다."
              requireAdmin
              allowSignUp={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AdminShell
        activeView={activePrimaryView}
        adminEmail={adminUser?.email ?? '관리자'}
        onNavigate={(view) => updateQuery(PRIMARY_VIEW_QUERY[view])}
        onLogout={() => void handleLogout()}
      >
        <section className={styles.panel}
        >
          {activeTab === 'pages' ? (
            <AdminPagesTab
              loading={pagesLoading}
              refreshing={pagesRefreshing}
              summaryLoading={summaryLoading}
              weddingPages={categoryPages}
              filteredPages={filteredPages}
              pageSearch={pageSearch}
              pageEventTypeFilter={pageEventTypeFilter}
              pageShortcutFilter={pageShortcutFilter}
              pageStatusFilter={pageStatusFilter}
              pageSort={pageSort}
              activePageCategory={activePageCategory}
              chips={pageFilterChips}
              onQueryChange={updateQuery}
              onRefresh={() => void refreshPages()}
              onTogglePublished={(page, nextPublished) =>
                void handleTogglePublished(page, nextPublished)
              }
              onChangeTier={(page, nextTier) =>
                void handleChangeTier(page, nextTier)
              }
              onEnableVariant={(page, variantKey) =>
                void handleEnableVariant(page, variantKey)
              }
              onDisableVariant={(page, variantKey) =>
                void handleDisableVariant(page, variantKey)
              }
              updatingPublishedPageSlug={updatingPublishedPageSlug}
              updatingVariantToken={updatingVariantToken}
              updatingTierPageSlug={updatingTierPageSlug}
              deletingPageSlug={deletingPageSlug}
              issuingOwnershipInviteSlug={issuingOwnershipInviteSlug}
              onDeletePage={(page) => void handleDeletePage(page)}
              onIssueOwnershipInvite={(pageSlug) =>
                void issueOwnershipInviteAndOpen(pageSlug)
              }
            />
          ) : null}

          {activeTab === 'memory' ? <MemoryPageManager /> : null}
          {activeTab === 'images' ? (
            <ImageManager eventTypeFilter={activePageCategoryEventType} />
          ) : null}

          {activeTab === 'comments' ? (
            <AdminCommentsTab
              commentsLoading={commentsLoading}
              commentsRefreshing={commentsRefreshing}
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

          {activeTab === 'accounts' ? (
            <AdminCustomerAccountsTab
              loading={accountsLoading}
              refreshing={accountsRefreshing}
              accounts={customerAccounts}
              unassignedEvents={unassignedCustomerEvents}
              ownershipActionToken={ownershipActionToken}
              issuingOwnershipInviteSlug={issuingOwnershipInviteSlug}
              walletGrantActionToken={walletGrantActionToken}
              deletingCustomerUid={deletingCustomerUid}
              onRefresh={() => void fetchCustomerAccounts()}
              onAssign={(uid, pageSlug) =>
                void handleAssignCustomerOwnership(uid, pageSlug)
              }
              onClear={(pageSlug) => void handleClearCustomerOwnership(pageSlug)}
              onIssueOwnershipInvite={(pageSlug) =>
                void issueOwnershipInviteAndOpen(pageSlug)
              }
              onGrantWalletCredit={(uid, grant) =>
                void handleGrantCustomerWalletCredit(uid, grant)
              }
              onDeleteAccount={(uid) => void handleDeleteCustomerAccount(uid)}
            />
          ) : null}

          {activeTab === 'periods' ? (
            <DisplayPeriodManager
              isVisible={true}
              statusFilter={periodStatusFilter}
              eventTypeFilter={activePageCategoryEventType}
              onDataChanged={() => void fetchSummarySources()}
            />
          ) : null}
        </section>
      </AdminShell>
      <AdminOwnershipInviteDialog
        invite={ownershipInvite}
        isReissuing={issuingOwnershipInviteSlug === ownershipInvite?.slug}
        onClose={() => setOwnershipInvite(null)}
        onReissue={reissueOwnershipInvite}
      />
    </div>
  );
}
