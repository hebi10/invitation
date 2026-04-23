'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { DisplayPeriodManager, ImageManager, MemoryPageManager } from '@/components/admin';
import { useAdmin } from '@/contexts';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services';

import {
  AdminClientPasswordsTab,
  AdminCommentsTab,
  AdminCustomerAccountsTab,
  AdminPagesTab,
  StatusBadge,
  SummaryCards,
  useAdminOverlay,
  type SummaryCardItem,
} from './_components';
import {
  ADMIN_SECTIONS,
  COMMENTS_PER_PAGE,
  DUE_SOON_DAYS,
  PAGE_CATEGORY_TABS,
  PAGE_SORT_LABELS,
  PAGE_STATUS_LABELS,
  type PageCategoryTabKey,
  RECENT_COMMENT_DAYS,
  TOTAL_SHORTCUT_COUNT,
  getDefaultTabForSection,
  getAvailableShortcuts,
  getSectionForTab,
  getTabsForSection,
  isRecentComment,
  numberFromParam,
  parseCommentAge,
  parsePageSort,
  parsePageStatus,
  parsePageEventType,
  parsePeriodFilter,
  parseSection,
  parseShortcut,
  parseTab,
} from './_components/adminPageUtils';
import {
  getSectionLabel,
  getSectionSummary,
  getTabLabel,
  getTabSummary,
} from './_components/adminTabMeta';
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

export default function AdminPageClient() {
  const { adminUser, isAdminLoggedIn, isAdminLoading, logout } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? '/admin';
  const searchParams = useSearchParams();
  const safeSearchParams = searchParams ?? new URLSearchParams();
  const returnPath = (() => {
    const value = safeSearchParams.get('next');
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return null;
    }

    return value;
  })();
  const { confirm, showToast } = useAdminOverlay();

  /* ── URL query ── */

  const requestedTabParam = safeSearchParams.get('tab');
  const requestedSectionParam = safeSearchParams.get('section');
  const requestedTab = parseTab(requestedTabParam);
  const requestedSection = requestedSectionParam;
  const activeSection = requestedSection
    ? parseSection(requestedSection)
    : getSectionForTab(requestedTab);
  const sectionTabs = getTabsForSection(activeSection);
  const activeTab = sectionTabs.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : getDefaultTabForSection(activeSection);
  const [activePageCategory, setActivePageCategory] =
    useState<PageCategoryTabKey>('invitation');
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
    handleLogout: dataLogout,
  } = useAdminData({ isAdminLoggedIn, activeTab, showToast, confirm });

  /* ── Handlers ── */

  const handleLogout = async () => {
    await logout();
    dataLogout();
    router.replace(safePathname, { scroll: false });
  };

  useEffect(() => {
    if (isAdminLoggedIn && returnPath) {
      router.replace(returnPath, { scroll: false });
    }
  }, [isAdminLoggedIn, returnPath, router]);

  useEffect(() => {
    const needsCanonicalSection = requestedSectionParam !== activeSection;
    const needsCanonicalTab = requestedTabParam !== activeTab;

    if (!needsCanonicalSection && !needsCanonicalTab) {
      return;
    }

    const nextParams = new URLSearchParams(safeSearchParams.toString());
    nextParams.set('section', activeSection);
    nextParams.set('tab', activeTab);

    router.replace(
      `${safePathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`,
      { scroll: false }
    );
  }, [
    activeSection,
    activeTab,
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

        return matchesSearch && matchesEventType && matchesShortcut && matchesStatus;
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
    pageEventTypeFilter,
    pageSearch,
    pageShortcutFilter,
    pageSort,
    pageStatusFilter,
    pages,
  ]);

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
  const configuredPasswordCount = clientPasswords.filter((entry) => entry.hasPassword).length;
  const recentPasswordUpdateCount = clientPasswords.filter((entry) => {
    const updatedAt = entry.updatedAt?.getTime() ?? 0;
    if (!updatedAt) {
      return false;
    }

    return Date.now() - updatedAt <= RECENT_COMMENT_DAYS * 24 * 60 * 60 * 1000;
  }).length;
  const customerAccountCount = customerAccounts.length;
  const linkedCustomerEventCount = customerAccounts.reduce(
    (sum, account) => sum + account.linkedEvents.length,
    0
  );
  const orphanedAccountCount = customerAccounts.filter((account) => account.missingAuthUser).length;
  const unassignedCustomerEventCount = unassignedCustomerEvents.length;

  const customerSummaryCards: SummaryCardItem[] = [
    {
      id: 'customer-accounts',
      label: '고객 계정',
      value: customerAccountCount,
      meta:
        customerAccountCount > 0
          ? 'Firebase 로그인 기준으로 고객이 직접 관리할 수 있는 계정 목록입니다.'
          : '아직 고객 관리 대상 계정이 없습니다.',
      tone: customerAccountCount > 0 ? 'success' : 'neutral',
      actionLabel: '고객 계정 열기',
      onClick: () => updateQuery({ section: 'customers', tab: 'accounts' }),
    },
    {
      id: 'linked-customer-events',
      label: '연결된 이벤트',
      value: linkedCustomerEventCount,
      meta:
        linkedCustomerEventCount > 0
          ? '사용자 페이지에서 바로 수정할 수 있도록 ownerUid가 연결된 청첩장 수입니다.'
          : '아직 고객 계정과 연결된 청첩장이 없습니다.',
      tone: linkedCustomerEventCount > 0 ? 'primary' : 'neutral',
      actionLabel: '연결 상태 보기',
      onClick: () => updateQuery({ section: 'customers', tab: 'accounts' }),
    },
    {
      id: 'unassigned-events',
      label: '미연결 이벤트',
      value: unassignedCustomerEventCount,
      meta:
        unassignedCustomerEventCount > 0
          ? '아직 어느 고객 계정에도 연결되지 않아 사용자 페이지에 보이지 않는 청첩장입니다.'
          : '모든 청첩장이 고객 계정에 연결되어 있습니다.',
      tone: unassignedCustomerEventCount > 0 ? 'warning' : 'success',
      actionLabel: '계정에 연결하기',
      onClick: () => updateQuery({ section: 'customers', tab: 'accounts' }),
    },
    {
      id: 'configured-passwords',
      label: '비밀번호 설정됨',
      value: configuredPasswordCount,
      meta:
        orphanedAccountCount > 0
          ? `삭제된 계정에 남아 있는 청첩장 ${orphanedAccountCount}건이 있어 연결 상태를 점검해 주세요.`
          : configuredPasswordCount > 0
            ? `최근 ${RECENT_COMMENT_DAYS}일 이내 변경된 비밀번호 ${recentPasswordUpdateCount}건을 포함합니다.`
            : '설정된 고객 비밀번호가 아직 없습니다.',
      tone: orphanedAccountCount > 0 ? 'warning' : configuredPasswordCount > 0 ? 'primary' : 'neutral',
      actionLabel: '비밀번호 보기',
      onClick: () => updateQuery({ section: 'customers', tab: 'passwords' }),
    },
  ];

  const eventSummaryCards: SummaryCardItem[] = [
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
      onClick: () => updateQuery({ section: 'events', tab: 'pages' }),
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
      onClick: () =>
        updateQuery({ section: 'events', tab: 'periods', periodStatus: 'dueSoon' }),
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
        updateQuery({
          section: 'events',
          tab: 'comments',
          commentAge: 'recent',
          commentPage: '1',
        }),
    },
    {
      id: 'memoryVisible',
      label: '공개 추억 페이지',
      value: memoryPublicCount,
      meta: `청첩장 ${invitationCount}개와 별도로 운영됩니다.`,
      tone: memoryPublicCount > 0 ? 'primary' : 'neutral',
      actionLabel: '추억 페이지 열기',
      onClick: () => updateQuery({ section: 'events', tab: 'memory' }),
    },
  ];

  const summaryCards =
    activeSection === 'customers' ? customerSummaryCards : eventSummaryCards;

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

  const activeSectionLabel = getSectionLabel(activeSection);
  const activeSectionSummary = getSectionSummary(activeSection);
  const activeTabSummary = getTabSummary(activeTab);
  const shouldShowPageCategoryTabs =
    activeSection === 'events' && activeTab === 'pages';

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
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div className={styles.headerTopRow}>
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
                {activeSectionSummary.description}
              </p>
            </div>
            <div className={styles.headerSummary}>
              <StatusBadge tone="primary">{activeSectionLabel}</StatusBadge>
              <strong className={styles.headerSummaryTitle}>
                {activeSectionSummary.title}
              </strong>
              <p className={styles.headerSummaryText}>{activeTabSummary.description}</p>
              <p className={styles.headerSummaryMeta}>
                {activeSectionSummary.helper} · {activeTabSummary.helper}
              </p>
              <p className={styles.headerSummaryLegacy}>
                {activeSectionSummary.title}
              </p>
            </div>
          </div>
        </header>

        <SummaryCards items={summaryCards} />

        <div className={styles.tabBar}>
          <div className={styles.tabBarGroup} role="tablist" aria-label="관리 섹션">
            {ADMIN_SECTIONS.map(({ key: sectionKey }) => (
              <button
                key={sectionKey}
                type="button"
                role="tab"
                aria-selected={activeSection === sectionKey}
                aria-controls={`section-${sectionKey}`}
                id={`section-${sectionKey}`}
                className={`${styles.tabButton} ${
                  activeSection === sectionKey ? styles.tabButtonActive : ''
                }`}
                onClick={() =>
                  updateQuery({
                    section: sectionKey,
                    tab: getDefaultTabForSection(sectionKey),
                  })
                }
              >
                {getSectionLabel(sectionKey)}
              </button>
            ))}
          </div>

          {shouldShowPageCategoryTabs ? (
            <>
              <div className={styles.tabBarDivider} aria-hidden="true" />
              <div
                className={styles.tabBarInlineGroup}
                role="tablist"
                aria-label="페이지 유형 탭"
              >
                {PAGE_CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activePageCategory === tab.key}
                    className={`${styles.innerTabButton} ${
                      activePageCategory === tab.key
                        ? styles.innerTabButtonActive
                        : ''
                    }`}
                    onClick={() => setActivePageCategory(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="세부 관리 탭">
          {sectionTabs.map(({ key: tabKey }) => (
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
                  section: activeSection,
                  tab: tabKey,
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
              onDeletePage={(page) => void handleDeletePage(page)}
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

          {activeTab === 'accounts' ? (
            <AdminCustomerAccountsTab
              loading={accountsLoading}
              accounts={customerAccounts}
              unassignedEvents={unassignedCustomerEvents}
              ownershipActionToken={ownershipActionToken}
              onRefresh={() => void fetchCustomerAccounts()}
              onAssign={(uid, pageSlug) =>
                void handleAssignCustomerOwnership(uid, pageSlug)
              }
              onClear={(pageSlug) => void handleClearCustomerOwnership(pageSlug)}
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
