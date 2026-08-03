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
  return {
    total: pages.length,
    published: pages.filter((page) => page.published).length,
    private: pages.filter((page) => !page.published).length,
    unassigned: pages.filter((page) => page.ownershipKind === 'unassigned').length,
  };
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
