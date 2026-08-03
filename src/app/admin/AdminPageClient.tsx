'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { DisplayPeriodManager, ImageManager, MemoryPageManager } from '@/components/admin';
import { useAdmin } from '@/contexts';
import type { AdminOwnershipInviteResult } from '@/services/eventOwnershipInviteService';

import {
  AdminCommentsTab,
  AdminCustomerAccountsTab,
  AdminOwnershipInviteDialog,
  AdminEventWorkspace,
  AdminShell,
  StatusBadge,
  useAdminOverlay,
} from './_components';
import {
  COMMENTS_PER_PAGE,
  RECENT_COMMENT_DAYS,
  getDefaultTabForSection,
  getPageCategoryEventTypeFilter,
  getSectionForTab,
  getTabsForSection,
  isRecentComment,
  numberFromParam,
  parseAdminPrimaryView,
  parseCommentAge,
  parsePageCategory,
  parsePeriodFilter,
  parseSection,
  parseTab,
  resolveLegacyEventTypeFilter,
} from './_components/adminPageUtils';
import {
  parseAdminEventOwnership,
  parseAdminEventPublished,
  parseAdminEventSort,
  parseAdminEventType,
  shouldIncludeAdminComment,
  type AdminEventFilters,
} from './_components/adminEventWorkspaceModel';
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
  const [mobileViewportState, setMobileViewportState] = useState<
    'unknown' | 'mobile' | 'desktop'
  >('unknown');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () =>
      setMobileViewportState(mediaQuery.matches ? 'mobile' : 'desktop');

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

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
  const requestedPageTypeParam = safeSearchParams.get('pageType');
  const eventFilters: AdminEventFilters = {
    query: pageSearch,
    eventType: parseAdminEventType(
      requestedPageTypeParam !== null || requestedPageCategoryParam !== null
        ? resolveLegacyEventTypeFilter(
            requestedPageTypeParam,
            requestedPageCategoryParam
          )
        : null
    ),
    published: parseAdminEventPublished(safeSearchParams.get('published')),
    ownership: parseAdminEventOwnership(safeSearchParams.get('ownership')),
    sort: parseAdminEventSort(safeSearchParams.get('pageSort')),
  };
  const selectedEventSlug = safeSearchParams.get('event');
  const commentSearch = safeSearchParams.get('commentQ') ?? '';
  const requestedCommentPageSlug = safeSearchParams.get('commentPageSlug');
  const selectedPageSlug =
    requestedCommentPageSlug ?? selectedEventSlug ?? 'all';
  const isEventCommentFilterActive = selectedPageSlug !== 'all';
  const commentAgeFilter = parseCommentAge(safeSearchParams.get('commentAge'));
  const currentPage = numberFromParam(safeSearchParams.get('commentPage'), 1);
  const currentEventPage = numberFromParam(safeSearchParams.get('page'), 1);
  const periodStatusFilter = parsePeriodFilter(safeSearchParams.get('periodStatus'));
  const activePageCategoryEventType = getPageCategoryEventTypeFilter(activePageCategory);
  const requestedRelatedEventType = parseAdminEventType(requestedPageTypeParam);
  const relatedManagerEventTypeFilter =
    requestedRelatedEventType === 'all'
      ? activePageCategoryEventType
      : requestedRelatedEventType;

  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(safeSearchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === '' ||
        (value === 'all' && key !== 'commentPageSlug')
      ) {
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
    updatingPublishedPageSlug,
    updatingVariantToken,
    updatingTierPageSlug,
    deletingPageSlug,
    commentsLoading,
    commentsRefreshing,
    accountsLoading,
    accountsRefreshing,
    pagesError,
    commentsError,
    accountsError,
    deletingCustomerUid,
    ownershipActionToken,
    issuingOwnershipInviteSlug,
    walletGrantActionToken,
    refreshPages,
    retryPages,
    retryComments,
    retryAccounts,
    fetchComments,
    fetchCustomerAccounts,
    fetchSummarySources,
    handleDeleteComment,
    handleDeletePage,
    handleAssignCustomerOwnership,
    handleClearCustomerOwnership,
    handleIssueOwnershipInvite,
    handleTogglePublished,
    handleChangeTier,
    handleEnableVariant,
    handleDisableVariant,
    handleGrantCustomerWalletCredit,
    handleDeleteCustomerAccount,
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

  const requestOwnershipInviteForDetail = async (pageSlug: string) => {
    const approved = await confirm({
      title: '고객 연결 링크를 발급할까요?',
      description: '기존에 발급한 고객 연결 링크가 있다면 새 링크를 발급한 뒤 사용할 수 없게 됩니다.',
      confirmLabel: '링크 발급',
      cancelLabel: '취소',
    });
    if (!approved) {
      return;
    }

    await issueOwnershipInviteAndOpen(pageSlug);
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
      activeSection === 'events' &&
      requestedPageCategoryParam !== null &&
      requestedPageCategoryParam !== activePageCategory;

    if (!needsCanonicalSection && !needsCanonicalTab && !needsCanonicalPageCategory) {
      return;
    }

    const nextParams = new URLSearchParams(safeSearchParams.toString());
    nextParams.set('section', activeSection);
    nextParams.set('tab', activeTab);
    if (activeSection === 'events' && requestedPageCategoryParam !== null) {
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

  const categoryPages = useMemo(() => {
    if (requestedPageCategoryParam === null || !activePageCategoryEventType) {
      return pages;
    }

    return pages.filter((page) => page.eventType === activePageCategoryEventType);
  }, [activePageCategoryEventType, pages, requestedPageCategoryParam]);

  const categoryPageSlugs = useMemo(
    () => new Set(categoryPages.map((page) => page.slug)),
    [categoryPages]
  );

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      const matchesScope = shouldIncludeAdminComment({
        commentPageSlug: comment.pageSlug,
        selectedPageSlug,
        categoryPageSlugs,
        hasLegacyPageCategory: requestedPageCategoryParam !== null,
      });
      const matchesSearch = `${comment.author} ${comment.message} ${comment.pageSlug}`
        .toLowerCase()
        .includes(commentSearch.trim().toLowerCase());
      const matchesAge =
        commentAgeFilter === 'all' || isRecentComment(comment.createdAt);
      return matchesScope && matchesSearch && matchesAge;
    });
  }, [
    categoryPageSlugs,
    commentAgeFilter,
    commentSearch,
    comments,
    requestedPageCategoryParam,
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
    () => new Map(pages.map((page) => [page.slug, page.displayName])),
    [pages]
  );

  const commentPageOptions = useMemo(() => {
    const categoryCommentPageSlugs = comments
      .map((comment) => comment.pageSlug)
      .filter(
        (pageSlug) =>
          requestedPageCategoryParam === null ||
          categoryPageSlugs.has(pageSlug) ||
          pageSlug === selectedPageSlug
      );

    const selectedPage = pages.find((page) => page.slug === selectedPageSlug);

    return [
      ...new Set([
        ...categoryPages.map((page) => page.slug),
        ...(selectedPage ? [selectedPage.slug] : []),
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
    categoryPageSlugs,
    categoryPages,
    comments,
    pageNameMap,
    pages,
    requestedPageCategoryParam,
    selectedPageSlug,
  ]);

  useEffect(() => {
    if (currentPage !== normalizedCurrentPage) {
      updateQuery({ commentPage: String(normalizedCurrentPage) });
    }
  }, [currentPage, normalizedCurrentPage, updateQuery]);

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
            updateQuery({
              event: null,
              commentPageSlug: 'all',
              commentPage: '1',
            }),
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
        <section className={styles.panel}>
          {activeTab === 'pages' ? (
            <AdminEventWorkspace
              pages={pages}
              loading={pagesLoading}
              refreshing={pagesRefreshing}
              error={pagesError}
              filters={eventFilters}
              selectedSlug={selectedEventSlug}
              currentPage={currentEventPage}
              updatingPublishedSlug={updatingPublishedPageSlug}
              updatingVariantToken={updatingVariantToken}
              updatingTierSlug={updatingTierPageSlug}
              deletingSlug={deletingPageSlug}
              issuingInviteSlug={issuingOwnershipInviteSlug}
              onQueryChange={updateQuery}
              onRefresh={() => void refreshPages()}
              onRetry={() => void retryPages()}
              onTogglePublished={(page, next) => void handleTogglePublished(page, next)}
              onChangeTier={(page, next) => void handleChangeTier(page, next)}
              onEnableVariant={(page, theme) => void handleEnableVariant(page, theme)}
              onDisableVariant={(page, theme) => void handleDisableVariant(page, theme)}
              onIssueOwnershipInvite={(slug) => void requestOwnershipInviteForDetail(slug)}
              onDelete={(page) => void handleDeletePage(page)}
            />
          ) : null}

          {activeTab === 'memory' ? (
            <MemoryPageManager initialPageSlug={selectedEventSlug ?? undefined} />
          ) : null}
          {activeTab === 'images' ? (
            <ImageManager
              eventTypeFilter={relatedManagerEventTypeFilter}
              initialPageSlug={selectedEventSlug ?? undefined}
            />
          ) : null}

          {activeTab === 'comments' ? (
            <AdminCommentsTab
              commentsLoading={commentsLoading}
              commentsRefreshing={commentsRefreshing}
              commentsError={commentsError}
              comments={comments}
              filteredComments={filteredComments}
              currentComments={currentComments}
              currentPage={normalizedCurrentPage}
              totalPages={totalCommentPages}
              commentSearch={commentSearch}
              selectedPageSlug={selectedPageSlug}
              commentAgeFilter={commentAgeFilter}
              isEventFilterActive={isEventCommentFilterActive}
              chips={commentFilterChips}
              commentPageOptions={commentPageOptions}
              onRefresh={() => void fetchComments()}
              onRetryComments={() => void retryComments()}
              onQueryChange={updateQuery}
              onDeleteComment={(comment) => void handleDeleteComment(comment)}
              mobileReadOnly={mobileViewportState !== 'desktop'}
            />
          ) : null}

          {activeTab === 'accounts' ? (
            <AdminCustomerAccountsTab
              loading={accountsLoading}
              refreshing={accountsRefreshing}
              error={accountsError}
              accounts={customerAccounts}
              unassignedEvents={unassignedCustomerEvents}
              ownershipActionToken={ownershipActionToken}
              issuingOwnershipInviteSlug={issuingOwnershipInviteSlug}
              walletGrantActionToken={walletGrantActionToken}
              deletingCustomerUid={deletingCustomerUid}
              selectedEventSlug={selectedEventSlug}
              mobileReadOnly={mobileViewportState !== 'desktop'}
              onRefresh={() => void fetchCustomerAccounts()}
              onRetry={() => void retryAccounts()}
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
              eventTypeFilter={relatedManagerEventTypeFilter}
              initialPageSlug={selectedEventSlug ?? undefined}
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
