import { getEventPreviewLinks } from '@/lib/eventPreviewLinks';
import {
  getEventTypeDisplayLabel,
  listEnabledEventTypes,
  type EventTypeKey,
} from '@/lib/eventTypes';
import type { InvitationPageSummary } from '@/services/invitationPageService';
import type { InvitationThemeKey } from '@/types/invitationPage';

export type AdminEventPublishedFilter = 'all' | 'published' | 'private';
export type AdminEnabledEventTypeKey = Exclude<EventTypeKey, 'seventieth' | 'etc'>;
export type AdminEventTypeFilter = 'all' | AdminEnabledEventTypeKey;
export type AdminEventOwnershipFilter =
  | 'all'
  | InvitationPageSummary['ownershipKind'];
export type AdminEventSort = 'updated' | 'event-date' | 'name';
export type AdminEventCapabilityKey =
  | 'edit'
  | 'preview'
  | 'publish'
  | 'themes'
  | 'images'
  | 'memory'
  | 'comments'
  | 'period'
  | 'ownership';
export type AdminEventDetailTabKey =
  | 'overview'
  | 'period'
  | 'ownership'
  | 'memory'
  | 'images'
  | 'comments';

export interface AdminEventDetailTab {
  key: AdminEventDetailTabKey;
  label: string;
}

export interface AdminEventFilters {
  query: string;
  eventType: AdminEventTypeFilter;
  published: AdminEventPublishedFilter;
  ownership: AdminEventOwnershipFilter;
  sort: AdminEventSort;
}

export const DEFAULT_ADMIN_EVENT_FILTERS: AdminEventFilters = {
  query: '',
  eventType: 'all',
  published: 'all',
  ownership: 'all',
  sort: 'updated',
};

export const ADMIN_EVENT_TYPE_OPTIONS = listEnabledEventTypes();
export const ADMIN_EVENT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type AdminEventPageSize = (typeof ADMIN_EVENT_PAGE_SIZE_OPTIONS)[number];
export const ADMIN_EVENTS_PER_PAGE: AdminEventPageSize = ADMIN_EVENT_PAGE_SIZE_OPTIONS[0];
export type AdminEventCountFilter = 'all' | 'published' | 'private' | 'unassigned';

function isAdminEnabledEventType(value: string): value is AdminEnabledEventTypeKey {
  return ADMIN_EVENT_TYPE_OPTIONS.includes(value as EventTypeKey);
}

export function parseAdminEventType(value: string | null): AdminEventTypeFilter {
  return value && isAdminEnabledEventType(value) ? value : 'all';
}

export function parseAdminEventPublished(value: string | null) {
  return value === 'published' || value === 'private' ? value : 'all';
}

export function parseAdminEventOwnership(value: string | null) {
  return value === 'customer' || value === 'admin' || value === 'unassigned'
    ? value
    : 'all';
}

export function parseAdminEventSort(value: string | null) {
  return value === 'event-date' || value === 'name' ? value : 'updated';
}

export function parseAdminEventPageSize(value: string | null): AdminEventPageSize {
  const parsed = Number(value);
  return (
    ADMIN_EVENT_PAGE_SIZE_OPTIONS.find((option) => option === parsed) ??
    ADMIN_EVENTS_PER_PAGE
  );
}

export function filterAdminEvents(
  pages: InvitationPageSummary[],
  filters: AdminEventFilters
) {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');

  return [...pages]
    .filter((page) => {
      const searchable = `${page.displayName} ${page.slug} ${page.description} ${page.venue} ${getEventTypeDisplayLabel(page.eventType)}`
        .toLocaleLowerCase('ko-KR');
      return (
        ADMIN_EVENT_TYPE_OPTIONS.includes(page.eventType) &&
        (!query || searchable.includes(query)) &&
        (filters.eventType === 'all' || page.eventType === filters.eventType) &&
        (filters.published === 'all' ||
          page.published === (filters.published === 'published')) &&
        (filters.ownership === 'all' || page.ownershipKind === filters.ownership)
      );
    })
    .sort((left, right) => {
      if (filters.sort === 'name') {
        return left.displayName.localeCompare(right.displayName, 'ko');
      }
      if (filters.sort === 'event-date') {
        return left.date.localeCompare(right.date);
      }
      return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0);
    });
}

export function getAdminEventCounts(pages: InvitationPageSummary[]) {
  const enabledPages = pages.filter((page) => ADMIN_EVENT_TYPE_OPTIONS.includes(page.eventType));

  return {
    total: enabledPages.length,
    published: enabledPages.filter((page) => page.published).length,
    private: enabledPages.filter((page) => !page.published).length,
    unassigned: enabledPages.filter((page) => page.ownershipKind === 'unassigned').length,
  };
}

export function getAdminEventCountQuery(
  filter: AdminEventCountFilter
): Record<string, string | null> {
  if (filter === 'all') {
    return {
      published: null,
      ownership: null,
      event: null,
      page: '1',
    };
  }

  if (filter === 'unassigned') {
    return {
      ownership: 'unassigned',
      event: null,
      page: '1',
    };
  }

  return {
    published: filter,
    event: null,
    page: '1',
  };
}

export function isAdminEventDetailCloseKey(key: string) {
  return key === 'Escape';
}

export function getAdminEventPage(
  pages: InvitationPageSummary[],
  requestedPage: number,
  pageSize = ADMIN_EVENTS_PER_PAGE
) {
  const safePageSize = Math.max(1, Math.trunc(pageSize));
  const totalPages = Math.max(1, Math.ceil(pages.length / safePageSize));
  const currentPage = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;

  return {
    items: pages.slice(startIndex, startIndex + safePageSize),
    currentPage,
    totalPages,
  };
}

export function shouldIncludeAdminComment({
  commentPageSlug,
  selectedPageSlug,
  categoryPageSlugs,
  hasLegacyPageCategory,
}: {
  commentPageSlug: string;
  selectedPageSlug: string;
  categoryPageSlugs: ReadonlySet<string>;
  hasLegacyPageCategory: boolean;
}) {
  if (selectedPageSlug !== 'all') {
    return commentPageSlug === selectedPageSlug;
  }

  return !hasLegacyPageCategory || categoryPageSlugs.has(commentPageSlug);
}

export function filterAdminEventComments<T extends { pageSlug: string }>(
  comments: T[],
  pageSlug: string
) {
  return comments.filter((comment) => comment.pageSlug === pageSlug);
}

export function validateAdminEventPeriodInput({
  enabled,
  startDate,
  endDate,
}: {
  enabled: boolean;
  startDate: string;
  endDate: string;
}) {
  if (!enabled) return null;
  if (!startDate || !endDate) return '시작일과 종료일을 모두 입력해 주세요.';

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '올바른 날짜를 입력해 주세요.';
  }
  if (start >= end) return '종료일은 시작일보다 뒤여야 합니다.';

  return null;
}

export function shouldClearMissingAdminEvent({
  selectedSlug,
  loading,
  error,
  hasSelectedPage,
}: {
  selectedSlug: string | null;
  loading: boolean;
  error: Error | null;
  hasSelectedPage: boolean;
}) {
  return Boolean(selectedSlug && !loading && !error && !hasSelectedPage);
}

export function getAdminEventCapabilities(page: InvitationPageSummary) {
  const capabilities: AdminEventCapabilityKey[] = [
    'edit',
    'preview',
    'publish',
    'period',
    'ownership',
  ];
  if (page.eventType === 'wedding') capabilities.push('themes', 'memory');
  if (page.features.maxGalleryImages > 0) capabilities.push('images');
  if (page.features.showGuestbook) capabilities.push('comments');
  return capabilities;
}

export function getAdminEventDetailTabs(page: InvitationPageSummary): AdminEventDetailTab[] {
  const capabilities = getAdminEventCapabilities(page);
  const tabs: AdminEventDetailTab[] = [
    { key: 'overview', label: '기본 정보' },
    { key: 'period', label: '노출 기간' },
    { key: 'ownership', label: '고객 연결' },
  ];

  if (capabilities.includes('memory')) tabs.push({ key: 'memory', label: '추억 페이지' });
  if (capabilities.includes('images')) tabs.push({ key: 'images', label: '이미지' });
  if (capabilities.includes('comments')) tabs.push({ key: 'comments', label: '방명록' });

  return tabs;
}

export function getAdminEventPreviewLinks(page: InvitationPageSummary) {
  const availableThemes = Object.entries(page.variants ?? {})
    .filter(([, variant]) => variant?.available)
    .map(([theme]) => theme as InvitationThemeKey);

  return getEventPreviewLinks({
    slug: page.slug,
    eventType: page.eventType,
    availableThemes,
    defaultTheme: page.defaultTheme,
    labelMode: 'admin',
  });
}

export function getAdminEventRelatedQuery(
  page: InvitationPageSummary,
  capability: Extract<
    AdminEventCapabilityKey,
    'images' | 'memory' | 'comments' | 'period' | 'ownership'
  >
): Record<string, string> {
  const base = { event: page.slug, pageType: page.eventType };
  if (capability === 'ownership') {
    return { section: 'customers', tab: 'accounts', ...base };
  }
  if (capability === 'comments') {
    return {
      section: 'events',
      tab: 'comments',
      ...base,
      commentPageSlug: page.slug,
    };
  }
  const tab = capability === 'period' ? 'periods' : capability;
  return { section: 'events', tab, ...base };
}
