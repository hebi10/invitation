import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { installAdminHistoryGuard } from '../src/app/admin/_components/adminHistoryNavigation.ts';
import { getAdminDataLoadPolicy } from '../src/app/admin/_hooks/adminDataLoadPolicy.ts';

import {
  DEFAULT_ADMIN_EVENT_FILTERS,
  ADMIN_EVENT_PAGE_SIZE_OPTIONS,
  filterAdminEvents,
  filterAdminEventComments,
  getAdminEventCapabilities,
  getAdminEventCounts,
  getAdminEventVisibility,
  getAdminEventDetailTabs,
  getAdminEventPreviewLinks,
  getAdminEventRelatedQuery,
  getAdminEventPage,
  getAdminEventCountQuery,
  isAdminEventDetailCloseKey,
  shouldClearMissingAdminEvent,
  shouldIncludeAdminComment,
  validateAdminEventPeriodInput,
  parseAdminEventOwnership,
  parseAdminEventPageSize,
  parseAdminEventPublished,
  parseAdminEventSort,
  parseAdminEventType,
  getAdminEventFilterResetQuery,
  resolveAdminEventDetailTab,
  getAdminEventKeyboardTab,
} from '../src/app/admin/_components/adminEventWorkspaceModel.ts';
import {
  getPaginationItems,
  parseAdminPrimaryView,
  resolveLegacyEventTypeFilter,
  getAdminQueryErrorMessage,
} from '../src/app/admin/_components/adminPageUtils.ts';
import { getPageWizardCreateHrefForEventType } from '../src/app/page-wizard/pageWizardEventConfig.ts';
import type { InvitationPageSummary } from '../src/services/invitationPageService.ts';

function readSource(path: string) {
  const absolutePath = resolve(process.cwd(), path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

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
assert.deepEqual(
  getAdminEventDetailTabs(pages[0]).map((tab) => tab.key),
  ['overview', 'design', 'period', 'ownership', 'memory', 'images', 'comments']
);
assert.deepEqual(
  getAdminEventDetailTabs(
    makePage('simple-event', 'general-event', {
      features: {
        ...pages[0].features,
        maxGalleryImages: 0,
        showGuestbook: false,
      },
    })
  ).map((tab) => tab.key),
  ['overview', 'period', 'ownership']
);
assert.equal(
  validateAdminEventPeriodInput({
    enabled: true,
    startDate: '2026-08-10',
    endDate: '2026-08-09',
  }),
  '종료일은 시작일보다 뒤여야 합니다.'
);
assert.equal(
  validateAdminEventPeriodInput({
    enabled: true,
    startDate: '2026-08-10',
    endDate: '2026-08-11',
  }),
  null
);
assert.deepEqual(
  filterAdminEventComments(
    [
      { id: '1', pageSlug: 'wedding-one' },
      { id: '2', pageSlug: 'birthday-one' },
    ],
    'wedding-one'
  ).map((comment) => comment.id),
  ['1']
);
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

const detailPanelSource = readSource('src/app/admin/_components/AdminEventDetailPanel.tsx');
const adminEventFiltersSource = readSource('src/app/admin/_components/AdminEventFilters.tsx');
const adminEventWorkspaceSource = readSource('src/app/admin/_components/AdminEventWorkspace.tsx');
const adminShellSource = readSource('src/app/admin/_components/AdminShell.tsx');
const periodTabSource = readSource('src/app/admin/_components/AdminEventPeriodTab.tsx');
const customerTabSource = readSource('src/app/admin/_components/AdminEventCustomerTab.tsx');
const commentsTabSource = readSource('src/app/admin/_components/AdminEventCommentsTab.tsx');
const imageManagerSource = readSource('src/components/admin/ImageManager/ImageManager.tsx');
const memoryManagerSource = readSource('src/components/admin/MemoryPageManager/MemoryPageManager.tsx');

assert.match(detailPanelSource, /role="tablist"/);
assert.match(adminShellSource, /customerPageHref/);
assert.match(adminShellSource, />\s*고객 페이지\s*</);
assert.match(adminShellSource, /target="_blank"/);
assert.match(detailPanelSource, /AdminEventPeriodTab/);
assert.match(detailPanelSource, /AdminEventCustomerTab/);
assert.match(detailPanelSource, /AdminEventCommentsTab/);
assert.match(periodTabSource, /validateAdminEventPeriodInput/);
assert.match(customerTabSource, /onAssign/);
assert.match(commentsTabSource, /filterAdminEventComments/);
assert.match(imageManagerSource, /lockedPageSlug/);
assert.match(memoryManagerSource, /lockedPageSlug/);
assert.match(memoryManagerSource, /getAllComments/);
assert.doesNotMatch(adminEventFiltersSource, /<details/);
assert.match(adminEventFiltersSource, /role="search"/);
assert.match(adminEventFiltersSource, /aria-label="이벤트 검색 및 필터"/);
assert.match(adminEventFiltersSource, /페이지당 개수/);
assert.doesNotMatch(detailPanelSource, /createPortal|aria-modal="true"/);
assert.match(detailPanelSource, /activeTab === 'design'/);
assert.match(detailPanelSource, /이벤트 목록으로/);
assert.match(
  adminEventFiltersSource,
  /onQueryChange\(\{\s*pageSize: event\.currentTarget\.value,\s*page: '1',\s*event: null,\s*\}\)/
);
assert.match(
  adminEventWorkspaceSource,
  /<AdminEventFilters\s+filters=\{filters\}\s+pageSize=\{pageSize\}\s+onQueryChange=\{onQueryChange\}/
);
assert.doesNotMatch(adminEventWorkspaceSource, /페이지당 개수/);

assert.deepEqual(
  pages.map((page) => getPageWizardCreateHrefForEventType(page.eventType)),
  ['/page-wizard/edit', '/first-birthday-wizard', '/birthday-wizard', '/general-event-wizard', '/opening-wizard']
);

console.log('admin event workspace model checks passed');

const currentTime = Date.now();
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'pages', selectedEventSlug: 'one', selectedEventDetailTab: 'overview' }), { pages: true, comments: false, accounts: false, summary: false }, 'event overview must not read all comments, accounts or unused aggregates');
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'pages', selectedEventSlug: 'one', selectedEventDetailTab: 'comments' }), { pages: true, comments: true, accounts: false, summary: false });
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'pages', selectedEventSlug: 'one', selectedEventDetailTab: 'ownership' }), { pages: true, comments: false, accounts: true, summary: false });
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'pages', selectedEventDetailTab: 'ownership' }), { pages: true, comments: false, accounts: false, summary: false }, 'orphan detail queries must not load accounts');
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'comments', selectedEventSlug: 'one' }), { pages: true, comments: true, accounts: false, summary: false });
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'accounts' }), { pages: false, comments: false, accounts: true, summary: false });
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: true, activeTab: 'periods' }), { pages: true, comments: false, accounts: false, summary: true });
assert.deepEqual(getAdminDataLoadPolicy({ isAdminLoggedIn: false, activeTab: 'pages', selectedEventSlug: 'one', selectedEventDetailTab: 'ownership' }), { pages: false, comments: false, accounts: false, summary: false });
const resetQuery = getAdminEventFilterResetQuery();
assert.equal(resetQuery.visibility, null, 'empty-result reset must clear the visibility filter');
assert.equal(resetQuery.pageQ, null, 'reset must clear event search');
assert.equal(resetQuery.page, '1', 'reset must return to the first page');
assert.equal(resolveAdminEventDetailTab('comments', [{ key: 'overview' }, { key: 'comments' }]), 'comments', 'detail query must restore supported tabs');
assert.equal(resolveAdminEventDetailTab('images', [{ key: 'overview' }]), 'overview', 'unsupported detail tabs must fall back to overview');
assert.equal(getAdminEventKeyboardTab('ArrowDown', 'overview', [{ key: 'overview' }, { key: 'comments' }], 'vertical'), 'comments', 'vertical tabs must support down arrow');
assert.equal(getAdminEventKeyboardTab('ArrowUp', 'overview', [{ key: 'overview' }, { key: 'comments' }], 'vertical'), 'comments', 'vertical keyboard navigation must wrap');
assert.equal(getAdminEventKeyboardTab('ArrowLeft', 'comments', [{ key: 'overview' }, { key: 'comments' }], 'horizontal'), 'overview');
assert.equal(getAdminEventKeyboardTab('End', 'overview', [{ key: 'overview' }, { key: 'comments' }], 'vertical'), 'comments');
assert.equal(getAdminEventKeyboardTab('Tab', 'overview', [{ key: 'overview' }], 'vertical'), null);
const entries: Array<{ url: string; state: Record<string, unknown> }> = [{ url: '/admin?page=2', state: { __NA: true } }];
let entryIndex = 0;
const popListeners = new Set<(event: PopStateEvent) => void>();
const fakeBrowser = {
  history: {
    get state() { return entries[entryIndex].state; },
    pushState(state: Record<string, unknown>, _title: string, url: string) {
      entries.splice(entryIndex + 1);
      entries.push({ state, url });
      entryIndex++;
    },
    replaceState(state: Record<string, unknown>, _title: string, url?: string) {
      entries[entryIndex] = { state, url: url ?? entries[entryIndex].url };
    },
    go(delta: number) {
      const nextIndex = entryIndex + delta;
      if (nextIndex < 0 || nextIndex >= entries.length) return;
      entryIndex = nextIndex;
      for (const listener of popListeners) listener({ state: entries[entryIndex].state, stopImmediatePropagation() {} } as PopStateEvent);
    },
  },
  addEventListener(_type: string, listener: (event: PopStateEvent) => void) { popListeners.add(listener); },
  removeEventListener(_type: string, listener: (event: PopStateEvent) => void) { popListeners.delete(listener); },
};
let dirty = true;
let pendingTraversal: (() => void) | undefined;
const uninstallHistoryGuard = installAdminHistoryGuard(
  fakeBrowser as unknown as Window,
  { shouldBlock: () => dirty, request: (action: () => void) => { pendingTraversal = action; } }
);
fakeBrowser.history.pushState({ __NA: true }, '', '/admin?page=2&event=one&detail=period');
fakeBrowser.history.go(-1);
assert.equal(entries[entryIndex].url, '/admin?page=2&event=one&detail=period', 'browser back must keep the unsaved detail visible until a decision');
assert.ok(pendingTraversal, 'browser back must request the same save/discard decision as UI navigation');
pendingTraversal = undefined;
fakeBrowser.history.go(-1);
assert.equal(entries[entryIndex].url, '/admin?page=2&event=one&detail=period', 'cancelled browser back must preserve the editable detail');
assert.ok(pendingTraversal, 'a later back request must still ask for a decision');
pendingTraversal();
assert.equal(entries[entryIndex].url, '/admin?page=2', 'approved browser back must restore the original list query');
assert.equal(fakeBrowser.history.state.__NA, true, 'Next navigation state must survive history tracking');
dirty = false;
fakeBrowser.history.go(1);
assert.equal(entries[entryIndex].url, '/admin?page=2&event=one&detail=period', 'clean forward must restore the detail URL');
uninstallHistoryGuard();

function createExistingHistoryFixture(hasNavigationApi: boolean) {
  const priorEntries: Array<{ url: string; state: Record<string, unknown> }> = [
    { url: '/admin?view=home', state: { __NA: true, tree: 'home' } },
    { url: '/admin?section=customers&tab=accounts', state: { __NA: true, tree: 'customers' } },
    { url: '/admin?page=2', state: { __NA: true, tree: 'list' } },
  ];
  let position = 2;
  const listeners = new Set<(event: PopStateEvent) => void>();
  const environment = {
    ...(hasNavigationApi ? { navigation: { get currentEntry() { return { index: position }; } } } : {}),
    location: {
      get href() { return priorEntries[position].url; },
      assign(url: string) { priorEntries.splice(position + 1); priorEntries.push({ url, state: {} }); position++; },
    },
    history: {
      get state() { return priorEntries[position].state; },
      pushState(state: Record<string, unknown>, _title: string, url: string) {
        priorEntries.splice(position + 1); priorEntries.push({ state, url }); position++;
      },
      replaceState(state: Record<string, unknown>, _title: string, url?: string) {
        priorEntries[position] = { state, url: url ?? priorEntries[position].url };
      },
      go(delta: number) {
        const destination = position + delta;
        if (destination < 0 || destination >= priorEntries.length) return;
        position = destination;
        for (const listener of listeners) listener({ state: priorEntries[position].state, stopImmediatePropagation() {} } as PopStateEvent);
      },
    },
    addEventListener(_type: string, listener: (event: PopStateEvent) => void) { listeners.add(listener); },
    removeEventListener(_type: string, listener: (event: PopStateEvent) => void) { listeners.delete(listener); },
  };
  return { environment, get position() { return position; } };
}

const existingHistory = createExistingHistoryFixture(true);
let existingPending: (() => void) | undefined;
const stopExistingGuard = installAdminHistoryGuard(existingHistory.environment as unknown as Window, {
  shouldBlock: () => true,
  request: (action) => { existingPending = action; },
});
existingHistory.environment.history.pushState({ __NA: true, tree: 'period' }, '', '/admin?page=2&event=one&detail=period');
existingHistory.environment.history.go(-3);
assert.equal(existingHistory.position, 3, 'three-entry back into unindexed history must restore the exact original entry');
assert.equal(existingHistory.environment.location.href, '/admin?page=2&event=one&detail=period', 'a blocked multistep traversal must keep the URL aligned with the editable detail');
assert.ok(existingPending);
existingPending();
assert.equal(existingHistory.position, 0, 'approved multistep back must arrive at its original destination');
assert.equal(existingHistory.environment.location.href, '/admin?view=home');
assert.equal(existingHistory.environment.history.state.tree, 'home', 'unindexed Next history state must remain intact');
existingPending = undefined;
existingHistory.environment.history.go(2);
assert.equal(existingHistory.position, 0, 'blocked multistep forward must restore the current unindexed entry');
assert.ok(existingPending);
existingPending();
assert.equal(existingHistory.position, 2, 'approved multistep forward must reach the requested unindexed entry');
assert.equal(existingHistory.environment.location.href, '/admin?page=2');
stopExistingGuard();

const legacyHistory = createExistingHistoryFixture(false);
let legacyPending: (() => void) | undefined;
const stopLegacyGuard = installAdminHistoryGuard(legacyHistory.environment as unknown as Window, {
  shouldBlock: () => true,
  request: (action) => { legacyPending = action; },
});
legacyHistory.environment.history.pushState({ __NA: true, tree: 'period' }, '', '/admin?page=2&event=one&detail=period');
legacyHistory.environment.history.go(-3);
assert.equal(legacyHistory.environment.location.href, '/admin?page=2&event=one&detail=period', 'unknown history without Navigation API must preserve the current URL instead of guessing a one-entry return');
assert.equal(legacyHistory.environment.history.state.tree, 'period', 'legacy fallback must preserve the current Next state while the user decides');
assert.ok(legacyPending);
legacyPending();
assert.equal(legacyHistory.environment.location.href, '/admin?view=home', 'approved unknown legacy history must explicitly navigate to its requested URL');
stopLegacyGuard();
const visibleBase = { published: true, displayPeriodEnabled: true, displayPeriodStart: new Date(currentTime - 86400000), displayPeriodEnd: new Date(currentTime + 86400000) };
assert.equal(getAdminEventVisibility(visibleBase).label, '곧 종료');
assert.equal(getAdminEventVisibility({ ...visibleBase, published: false }).label, '비공개');
assert.equal(getAdminEventVisibility({ ...visibleBase, displayPeriodEnabled: false }).label, '노출 중');
assert.equal(getAdminEventVisibility({ ...visibleBase, displayPeriodStart: null }).label, '기간 확인 필요');
assert.equal(getAdminEventVisibility({ ...visibleBase, displayPeriodStart: new Date(currentTime + 86400000), displayPeriodEnd: new Date(currentTime - 86400000) }).label, '기간 확인 필요', 'inverted periods must be actionable as invalid settings');
assert.equal(getAdminEventVisibility({ ...visibleBase, displayPeriodStart: new Date(currentTime + 3600000) }).label, '시작 전');
assert.equal(getAdminEventVisibility({ ...visibleBase, displayPeriodEnd: new Date(currentTime - 3600000) }).label, '만료');
const periodPages = [makePage('ending', 'wedding', visibleBase), makePage('private-ending', 'wedding', { ...visibleBase, published: false })];
const ownedPages = [makePage('customer-event', 'wedding', { ownerDisplayName: '김민서', ownerEmail: 'Minseo@Example.test' })];
assert.deepEqual(filterAdminEvents(ownedPages, { ...DEFAULT_ADMIN_EVENT_FILTERS, query: '김민서' }).map((page) => page.slug), ['customer-event'], 'event search must match the linked customer name');
assert.deepEqual(filterAdminEvents(ownedPages, { ...DEFAULT_ADMIN_EVENT_FILTERS, query: 'minseo@example.test' }).map((page) => page.slug), ['customer-event'], 'event search must match the linked email regardless of case');
assert.deepEqual(filterAdminEvents(periodPages, { ...DEFAULT_ADMIN_EVENT_FILTERS, visibility: 'due-soon' }).map((page) => page.slug), ['ending']);
assert.deepEqual(filterAdminEvents(periodPages, { ...DEFAULT_ADMIN_EVENT_FILTERS, visibility: 'expired' }), []);
assert.deepEqual(filterAdminEvents([makePage('invalid-period', 'wedding', { ...visibleBase, displayPeriodStart: null }), ...periodPages], { ...DEFAULT_ADMIN_EVENT_FILTERS, visibility: 'period-error' }).map((page) => page.slug), ['invalid-period']);
