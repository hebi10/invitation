'use client';

import { useEffect, useRef, useState } from 'react';

import type { InvitationPageSummary } from '@/services/invitationPageService';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import { getPageWizardCreateHrefForEventType } from '@/app/page-wizard/pageWizardEventConfig';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import type { InvitationProductTier } from '@/types/invitationPage';

import {
  filterAdminEvents,
  ADMIN_EVENTS_PER_PAGE,
  ADMIN_EVENT_TYPE_OPTIONS,
  getAdminEventPage,
  getAdminEventCounts,
  getAdminEventCountQuery,
  shouldClearMissingAdminEvent,
  type AdminEventFilters as AdminEventFiltersState,
} from './adminEventWorkspaceModel';
import AdminEventFilters from './AdminEventFilters';
import AdminEventDetailPanel from './AdminEventDetailPanel';
import AdminEventList from './AdminEventList';
import AdminEventMobileList from './AdminEventMobileList';
import AdminQueryState from './AdminQueryState';
import EmptyState from './EmptyState';
import Pagination from './Pagination';
import styles from '../page.module.css';

interface AdminEventWorkspaceProps {
  pages: InvitationPageSummary[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  filters: AdminEventFiltersState;
  selectedSlug: string | null;
  currentPage: number;
  updatingPublishedSlug: string | null;
  updatingVariantToken: string | null;
  updatingTierSlug: string | null;
  deletingSlug: string | null;
  issuingInviteSlug: string | null;
  onQueryChange: (updates: Record<string, string | null>) => void;
  onRefresh: () => void;
  onRetry: () => void;
  onTogglePublished: (page: InvitationPageSummary, next: boolean) => void;
  onChangeTier: (page: InvitationPageSummary, next: InvitationProductTier) => void;
  onEnableVariant: (page: InvitationPageSummary, variantKey: InvitationThemeKey) => void;
  onDisableVariant: (page: InvitationPageSummary, variantKey: InvitationThemeKey) => void;
  onIssueOwnershipInvite: (slug: string) => void;
  onDelete: (page: InvitationPageSummary) => void;
}

export default function AdminEventWorkspace({
  pages,
  loading,
  refreshing,
  error,
  filters,
  selectedSlug,
  currentPage,
  updatingPublishedSlug,
  updatingVariantToken,
  updatingTierSlug,
  deletingSlug,
  issuingInviteSlug,
  onQueryChange,
  onRefresh,
  onRetry,
  onTogglePublished,
  onChangeTier,
  onEnableVariant,
  onDisableVariant,
  onIssueOwnershipInvite,
  onDelete,
}: AdminEventWorkspaceProps) {
  const counts = getAdminEventCounts(pages);
  const filteredPages = filterAdminEvents(pages, filters);
  const eventPage = getAdminEventPage(filteredPages, currentPage);
  const selectedPage = selectedSlug ? pages.find((page) => page.slug === selectedSlug) : null;
  const lastSelectedSlug = useRef<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (
      shouldClearMissingAdminEvent({
        selectedSlug,
        loading,
        error,
        hasSelectedPage: Boolean(selectedPage),
      })
    ) {
      onQueryChange({ event: null });
    }
  }, [error, loading, onQueryChange, selectedPage, selectedSlug]);

  useEffect(() => {
    if (currentPage !== eventPage.currentPage) {
      onQueryChange({ page: String(eventPage.currentPage) });
    }
  }, [currentPage, eventPage.currentPage, onQueryChange]);

  useEffect(() => {
    if (selectedPage) {
      lastSelectedSlug.current = selectedPage.slug;
    }
  }, [selectedPage]);

  const closeDetail = () => {
    const slugToFocus = lastSelectedSlug.current;
    onQueryChange({ event: null });
    window.requestAnimationFrame(() => {
      [...document.querySelectorAll<HTMLButtonElement>('[data-event-slug]')]
        .find(
          (button) =>
            button.dataset.eventSlug === slugToFocus && button.offsetParent !== null
        )
        ?.focus();
    });
  };

  return (
    <div className={styles.eventWorkspace}>
      <header className={styles.eventWorkspaceHeader}>
        <div>
          <h1 className={styles.eventWorkspaceTitle}>이벤트 관리</h1>
          <p className={styles.eventWorkspaceDescription}>
            이벤트를 찾아 상태를 확인하고 편집 화면으로 이동하세요.
          </p>
        </div>
        <div className={styles.eventWorkspaceActions}>
          <button
            type="button"
            className={styles.eventRefreshButton}
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? '새로고침 중' : '새로고침'}
          </button>
          <details className={styles.eventCreateMenu}>
            <summary className="admin-button admin-button-primary">새 이벤트 만들기</summary>
            <div className={styles.eventCreateMenuList}>
              {ADMIN_EVENT_TYPE_OPTIONS.map((eventType) => (
                <a key={eventType} href={getPageWizardCreateHrefForEventType(eventType)}>
                  {getEventTypeDisplayLabel(eventType)}
                </a>
              ))}
            </div>
          </details>
        </div>
      </header>

      <div className={styles.eventCounts} aria-label="이벤트 현황">
        <button type="button" onClick={() => onQueryChange(getAdminEventCountQuery('all'))}>
          전체 {counts.total}
        </button>
        <button type="button" onClick={() => onQueryChange(getAdminEventCountQuery('published'))}>
          공개 {counts.published}
        </button>
        <button type="button" onClick={() => onQueryChange(getAdminEventCountQuery('private'))}>
          비공개 {counts.private}
        </button>
        <button type="button" onClick={() => onQueryChange(getAdminEventCountQuery('unassigned'))}>
          고객 미연결 {counts.unassigned}
        </button>
      </div>

      <AdminEventFilters filters={filters} onQueryChange={onQueryChange} />

      <div className={styles.eventWorkspaceContent}>
        <div className={styles.eventWorkspaceList}>
          <AdminQueryState
            loading={loading && pages.length === 0}
            error={error && pages.length === 0 ? error : null}
            empty={!loading && !error && pages.length === 0}
            emptyTitle="등록된 이벤트가 없습니다"
            emptyDescription="새 이벤트를 만들면 여기에서 공개 상태와 고객 연결을 관리할 수 있습니다."
            onRetry={onRetry}
          />
          {error && pages.length > 0 ? (
            <AdminQueryState
              loading={false}
              error={error}
              empty={false}
              emptyTitle=""
              emptyDescription=""
              onRetry={onRetry}
              compact
            />
          ) : null}
          {pages.length > 0 && filteredPages.length === 0 ? (
            <EmptyState
              title="현재 조건에 맞는 이벤트가 없습니다."
              description="검색어나 유형, 공개 상태, 고객 연결 필터를 다시 확인해 주세요."
              actionLabel="필터 초기화"
              onAction={() =>
                onQueryChange({
                  pageQ: null,
                  pageType: null,
                  published: null,
                  ownership: null,
                  pageSort: null,
                  pageCategory: null,
                  event: null,
                  page: '1',
                })
              }
            />
          ) : null}
          {eventPage.items.length > 0 ? (
            <>
              <AdminEventList
                pages={eventPage.items}
                selectedSlug={selectedSlug}
                onSelect={(slug) => onQueryChange({ event: slug })}
              />
              <AdminEventMobileList
                pages={eventPage.items}
                selectedSlug={selectedSlug}
                onSelect={(slug) => onQueryChange({ event: slug })}
              />
              <Pagination
                currentPage={eventPage.currentPage}
                totalPages={eventPage.totalPages}
                totalItems={filteredPages.length}
                pageSize={ADMIN_EVENTS_PER_PAGE}
                onPageChange={(page) => onQueryChange({ page: String(page), event: null })}
              />
            </>
          ) : null}
        </div>
        {selectedPage ? (
          <>
            <button
              type="button"
              className={styles.eventDetailMobileBackdrop}
              onClick={closeDetail}
              tabIndex={-1}
              aria-hidden="true"
            />
            <AdminEventDetailPanel
              page={selectedPage}
              isMobileSheet={isMobileViewport !== false}
              updatingPublished={updatingPublishedSlug === selectedPage.slug}
              updatingTier={updatingTierSlug === selectedPage.slug}
              updatingVariantToken={updatingVariantToken}
              deleting={deletingSlug === selectedPage.slug}
              issuingInvite={issuingInviteSlug === selectedPage.slug}
              onClose={closeDetail}
              onTogglePublished={onTogglePublished}
              onChangeTier={onChangeTier}
              onEnableVariant={onEnableVariant}
              onDisableVariant={onDisableVariant}
              onOpenRelated={onQueryChange}
              onIssueOwnershipInvite={onIssueOwnershipInvite}
              onDelete={onDelete}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
