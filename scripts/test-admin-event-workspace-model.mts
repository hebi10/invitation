import assert from 'node:assert/strict';

import {
  DEFAULT_ADMIN_EVENT_FILTERS,
  ADMIN_EVENT_PAGE_SIZE_OPTIONS,
  filterAdminEvents,
  getAdminEventCapabilities,
  getAdminEventCounts,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
  getAdminEventPage,
  getAdminEventCountQuery,
  isAdminEventDetailCloseKey,
  shouldClearMissingAdminEvent,
  shouldIncludeAdminComment,
  parseAdminEventOwnership,
  parseAdminEventPageSize,
  parseAdminEventPublished,
  parseAdminEventSort,
  parseAdminEventType,
} from '../src/app/admin/_components/adminEventWorkspaceModel.ts';
import {
  getPaginationItems,
  parseAdminPrimaryView,
  resolveLegacyEventTypeFilter,
  getAdminQueryErrorMessage,
} from '../src/app/admin/_components/adminPageUtils.ts';
import { getPageWizardCreateHrefForEventType } from '../src/app/page-wizard/pageWizardEventConfig.ts';
import type { InvitationPageSummary } from '../src/services/invitationPageService.ts';

function makePage(
  slug: string,
  eventType: InvitationPageSummary['eventType'],
  overrides: Partial<InvitationPageSummary> = {}
): InvitationPageSummary {
  return {
    slug,
    eventType,
    displayName: slug,
    description: '',
    date: '2026-08-10',
    venue: '서울',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-02T00:00:00Z'),
    published: false,
    defaultTheme: eventType === 'birthday' ? 'birthday-minimal' : 'emotional',
    productTier: 'standard',
    features: {
      maxGalleryImages: 10,
      shareMode: 'link',
      showMusic: false,
      showCountdown: true,
      showGuestbook: true,
    },
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
    variants: {},
    dataSource: 'firestore',
    hasCustomConfig: true,
    ownershipKind: 'unassigned',
    ...overrides,
  };
}

const pages = [
  makePage('wedding-one', 'wedding', { displayName: '서준과 지민', published: true }),
  makePage('first-birthday-one', 'first-birthday', { displayName: '하준 돌잔치' }),
  makePage('birthday-one', 'birthday', { displayName: '민서 생일', ownershipKind: 'customer' }),
  makePage('general-event-one', 'general-event', { displayName: '브랜드 나잇' }),
  makePage('opening-one', 'opening', { displayName: '그린테이블' }),
];

assert.deepEqual(
  filterAdminEvents(pages, {
    query: '민서',
    eventType: 'all',
    published: 'all',
    ownership: 'all',
    sort: 'updated',
  }).map((page) => page.slug),
  ['birthday-one']
);
assert.deepEqual(
  filterAdminEvents(pages, {
    ...DEFAULT_ADMIN_EVENT_FILTERS,
    query: '개업',
  }).map((page) => page.slug),
  ['opening-one']
);
assert.deepEqual(
  filterAdminEvents(
    [...pages, makePage('seventieth-one', 'seventieth')],
    DEFAULT_ADMIN_EVENT_FILTERS
  ).map((page) => page.slug),
  ['wedding-one', 'first-birthday-one', 'birthday-one', 'general-event-one', 'opening-one']
);
assert.equal(parseAdminEventType('opening'), 'opening');
assert.equal(parseAdminEventType('seventieth'), 'all');
assert.equal(parseAdminEventType('unknown'), 'all');
assert.equal(parseAdminEventPublished('published'), 'published');
assert.equal(parseAdminEventPublished('unknown'), 'all');
assert.equal(parseAdminEventOwnership('customer'), 'customer');
assert.equal(parseAdminEventOwnership('unknown'), 'all');
assert.equal(parseAdminEventSort('name'), 'name');
assert.equal(parseAdminEventSort('unknown'), 'updated');
assert.deepEqual(ADMIN_EVENT_PAGE_SIZE_OPTIONS, [10, 20, 50, 100]);
assert.equal(parseAdminEventPageSize('10'), 10);
assert.equal(parseAdminEventPageSize('20'), 20);
assert.equal(parseAdminEventPageSize('50'), 50);
assert.equal(parseAdminEventPageSize('100'), 100);
assert.equal(parseAdminEventPageSize('30'), 10);
assert.equal(parseAdminEventPageSize(null), 10);
assert.deepEqual(getAdminEventCounts(pages), {
  total: 5,
  published: 1,
  private: 4,
  unassigned: 4,
});
assert.deepEqual(
  getAdminEventCounts([
    ...pages,
    makePage('seventieth-one', 'seventieth', { published: true }),
  ]),
  {
    total: 5,
    published: 1,
    private: 4,
    unassigned: 4,
  }
);
assert.equal(getAdminEventCapabilities(pages[0]).includes('themes'), true);
assert.equal(getAdminEventCapabilities(pages[0]).includes('memory'), true);
assert.equal(getAdminEventCapabilities(pages[1]).includes('themes'), false);
assert.equal(
  getAdminEventCapabilities(
    makePage('guestbook-off', 'wedding', {
      features: {
        ...pages[0].features,
        showGuestbook: false,
      },
    })
  ).includes('comments'),
  false
);
assert.equal(
  getAdminEventCapabilities(
    makePage('gallery-off', 'birthday', {
      features: {
        ...pages[2].features,
        maxGalleryImages: 0,
      },
    })
  ).includes('images'),
  false
);
assert.equal(
  getAdminEventPreviewLinks(pages[2])[0]?.path,
  '/birthday-one/birthday-minimal'
);
assert.deepEqual(getAdminEventRelatedQuery(pages[2], 'comments'), {
  section: 'events',
  tab: 'comments',
  event: 'birthday-one',
  commentPageSlug: 'birthday-one',
  pageType: 'birthday',
});
assert.equal(parseAdminPrimaryView('pages'), 'events');
assert.equal(parseAdminPrimaryView('comments'), 'comments');
assert.equal(parseAdminPrimaryView('accounts'), 'customers');
assert.equal(resolveLegacyEventTypeFilter(null, null), 'all');
assert.equal(resolveLegacyEventTypeFilter(null, 'first-birthday'), 'first-birthday');
assert.equal(resolveLegacyEventTypeFilter('opening', 'invitation'), 'opening');
assert.equal(resolveLegacyEventTypeFilter('invalid', 'opening'), 'opening');
assert.deepEqual(getPaginationItems(1, 1), [1]);
assert.deepEqual(getPaginationItems(1, 10), [1, 2, 3, 'ellipsis-right', 10]);
assert.deepEqual(
  getPaginationItems(5, 10),
  [1, 'ellipsis-left', 3, 4, 5, 6, 7, 'ellipsis-right', 10]
);
assert.deepEqual(getPaginationItems(10, 10), [1, 'ellipsis-left', 8, 9, 10]);
assert.deepEqual(getPaginationItems(99, 3), [1, 2, 3]);
assert.deepEqual(getPaginationItems(1, 0), []);

assert.equal(
  shouldIncludeAdminComment({
    commentPageSlug: 'birthday-one',
    selectedPageSlug: 'all',
    categoryPageSlugs: new Set(['wedding-one']),
    hasLegacyPageCategory: false,
  }),
  true
);
assert.equal(
  shouldIncludeAdminComment({
    commentPageSlug: 'birthday-one',
    selectedPageSlug: 'all',
    categoryPageSlugs: new Set(['wedding-one']),
    hasLegacyPageCategory: true,
  }),
  false
);
assert.equal(
  shouldIncludeAdminComment({
    commentPageSlug: 'birthday-one',
    selectedPageSlug: 'birthday-one',
    categoryPageSlugs: new Set(['wedding-one']),
    hasLegacyPageCategory: true,
  }),
  true
);

assert.deepEqual(getAdminEventPage(pages, 2, 2), {
  items: [pages[2], pages[3]],
  currentPage: 2,
  totalPages: 3,
});
assert.deepEqual(getAdminEventPage(pages, 99, 2), {
  items: [pages[4]],
  currentPage: 3,
  totalPages: 3,
});
const pagedEvents = Array.from({ length: 21 }, (_, index) =>
  makePage(`paged-${index + 1}`, 'wedding')
);
assert.deepEqual(getAdminEventPage(pagedEvents, 2), {
  items: pagedEvents.slice(10, 20),
  currentPage: 2,
  totalPages: 3,
});
assert.equal(
  shouldClearMissingAdminEvent({
    selectedSlug: 'missing',
    loading: false,
    error: new Error('network'),
    hasSelectedPage: false,
  }),
  false
);
assert.equal(
  shouldClearMissingAdminEvent({
    selectedSlug: 'missing',
    loading: false,
    error: null,
    hasSelectedPage: false,
  }),
  true
);

assert.equal(getAdminQueryErrorMessage(new Error('FirebaseError: permission-denied')), '관리자 권한을 확인한 뒤 다시 시도해 주세요.');
assert.equal(
  getAdminQueryErrorMessage(Object.assign(new Error('request failed'), { code: 'permission-denied' })),
  '관리자 권한을 확인한 뒤 다시 시도해 주세요.'
);
assert.equal(
  getAdminQueryErrorMessage(Object.assign(new Error('request failed'), { code: 'auth/unauthenticated' })),
  '관리자 권한을 확인한 뒤 다시 시도해 주세요.'
);
assert.equal(
  getAdminQueryErrorMessage(Object.assign(new Error('request failed'), { code: 'unavailable' })),
  '잠시 서비스에 연결할 수 없습니다. 네트워크를 확인하고 다시 시도해 주세요.'
);
assert.equal(
  getAdminQueryErrorMessage(Object.assign(new Error('request failed'), { code: 'auth/network-request-failed' })),
  '잠시 서비스에 연결할 수 없습니다. 네트워크를 확인하고 다시 시도해 주세요.'
);
assert.equal(
  getAdminQueryErrorMessage(new Error('insufficient permissions for query')),
  '관리자 권한을 확인한 뒤 다시 시도해 주세요.'
);
assert.equal(getAdminQueryErrorMessage(new Error('sensitive backend detail')), '네트워크 상태를 확인하고 다시 시도해 주세요.');

assert.deepEqual(getAdminEventCountQuery('all'), {
  published: null,
  ownership: null,
  event: null,
  page: '1',
});
assert.deepEqual(getAdminEventCountQuery('published'), {
  published: 'published',
  event: null,
  page: '1',
});
assert.deepEqual(getAdminEventCountQuery('unassigned'), {
  ownership: 'unassigned',
  event: null,
  page: '1',
});
assert.equal(isAdminEventDetailCloseKey('Escape'), true);
assert.equal(isAdminEventDetailCloseKey('Tab'), false);

assert.deepEqual(
  pages.map((page) => getPageWizardCreateHrefForEventType(page.eventType)),
  ['/page-wizard', '/first-birthday-wizard', '/birthday-wizard', '/general-event-wizard', '/opening-wizard']
);

console.log('admin event workspace model checks passed');
