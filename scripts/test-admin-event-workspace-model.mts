import assert from 'node:assert/strict';

import {
  DEFAULT_ADMIN_EVENT_FILTERS,
  filterAdminEvents,
  getAdminEventCapabilities,
  getAdminEventCounts,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
  parseAdminEventOwnership,
  parseAdminEventPublished,
  parseAdminEventSort,
  parseAdminEventType,
} from '../src/app/admin/_components/adminEventWorkspaceModel.ts';
import {
  parseAdminPrimaryView,
  resolveLegacyEventTypeFilter,
} from '../src/app/admin/_components/adminPageUtils.ts';
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
  makePage('birthday-one', 'birthday', { displayName: '민서 생일', ownershipKind: 'customer' }),
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
  ['wedding-one', 'birthday-one', 'opening-one']
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
assert.deepEqual(getAdminEventCounts(pages), {
  total: 3,
  published: 1,
  private: 2,
  unassigned: 2,
});
assert.equal(getAdminEventCapabilities(pages[0]).includes('themes'), true);
assert.equal(getAdminEventCapabilities(pages[1]).includes('themes'), false);
assert.equal(
  getAdminEventPreviewLinks(pages[1])[0]?.path,
  '/birthday-one/birthday-minimal'
);
assert.deepEqual(getAdminEventRelatedQuery(pages[1], 'comments'), {
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

console.log('admin event workspace model checks passed');
