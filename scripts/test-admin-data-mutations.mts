import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import ts from 'typescript';
import * as deletionState from '../src/lib/adminEventDeletionState.ts';

function load<T>(file: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console: { error() {} }, require(id: string) {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected admin hook dependency: ${id}`);
  } });
  return exports as T;
}
const { appQueryKeys } = load<typeof import('../src/lib/appQuery')>('src/lib/appQuery.ts', {});
const loadPolicy = load<typeof import('../src/app/admin/_hooks/adminDataLoadPolicy')>('src/app/admin/_hooks/adminDataLoadPolicy.ts', {});
const inviteQueries = load<typeof import('../src/app/admin/_hooks/adminOwnershipInviteQuery')>('src/app/admin/_hooks/adminOwnershipInviteQuery.ts', {});
const page = { slug: 'test-event', displayName: '테스트 이벤트', published: false, defaultTheme: 'simple', productTier: 'premium', variants: {} };
const comment = { id: 'comment-1', collectionName: 'events/event-1/comments', author: '고객', message: '축하합니다' };
const summary = { memoryPublicCount: 0, invitationCount: 1, restrictedCount: 0, dueSoonCount: 0, commentSummary: { totalCount: 1, recentCount: 1, recentDays: 30 } };
type Toast = { title: string; message?: string; tone: string };
type Hook = ReturnType<typeof import('../src/app/admin/_hooks/useAdminData').useAdminData>;
function fixture(overrides: Record<string, unknown> = {}, activeTab = 'pages', confirm: () => Promise<boolean> = async () => true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  client.setQueryData(appQueryKeys.adminInvitationPages, [page]);
  client.setQueryData(appQueryKeys.adminDashboardSummary(30), summary);
  client.setQueryData(appQueryKeys.adminComments, [comment]);
  client.setQueryData(appQueryKeys.adminCustomerAccounts, { accounts: [{ uid: 'customer-1', linkedEvents: [] }], unassignedEvents: [] });
  const toasts: Toast[] = [];
  const calls: string[] = [];
  const observers: QueryObserver[] = [];
  const gateway = {
    getDashboardSummary: async () => { calls.push('summary'); return summary; },
    getPages: async () => { calls.push('pages'); return [page]; },
    getComments: async () => { calls.push('comments'); return [comment]; },
    getCustomerAccounts: async () => { calls.push('accounts'); return { accounts: [], unassignedEvents: [] }; },
    setPublished: async () => { calls.push('publish'); },
    assignOwnership: async () => { calls.push('assign'); }, clearOwnership: async () => { calls.push('clear'); },
    issueOwnershipInvite: async () => { calls.push('issue'); return { slug: page.slug, url: 'https://example.test/invite', expiresAt: new Date() }; },
    deleteCustomer: async () => { calls.push('delete-customer'); return { detachedEventCount: 0, unpublishedEventCount: 0 }; },
    deleteComment: async () => { calls.push('delete-comment'); },
    deleteEvent: async () => { calls.push('delete-event'); return { success: true, deletionStatus: 'completed' }; },
    ...overrides,
  };
  // Keep production helpers real; isolate React mounting and remote reads/writes only.
  const hook = load<{ useAdminData: (options: unknown) => Hook }>('src/app/admin/_hooks/useAdminData.ts', {
    '@tanstack/react-query': { useQueryClient: () => client, useQuery: (options: object) => {
      const observer = new QueryObserver(client, { ...options, retry: false }); observers.push(observer); return observer.getCurrentResult();
    } },
    react: { useCallback: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(), useEffect() {}, useState: (initial: unknown) => [initial, () => {}], useRef: (initial: unknown) => ({ current: initial }) },
    '@/lib/adminEventDeletionState': deletionState, '@/lib/adminCustomerSelection': { getCustomerAssignmentConfirmation: () => '고객에 연결' },
    '@/lib/adminInvitationPreviewCache': { clearAdminInvitationPreviewCache() {}, writeAdminInvitationPreviewCache() {} },
    '@/lib/appQuery': { appQueryKeys, ADMIN_STALE_TIME_MS: 45_000, ADMIN_GC_TIME_MS: 600_000 },
    '@/lib/invitationThemes': { getInvitationThemeAdminLabel: (theme: string) => theme },
    '../_components/adminPageUtils': { RECENT_COMMENT_DAYS: 30 }, './adminDataLoadPolicy': loadPolicy,
    './adminOwnershipInviteQuery': inviteQueries,
    './adminDataMutationPolicy': load('src/app/admin/_hooks/adminDataMutationPolicy.ts', {}),
  }).useAdminData({ isAdminLoggedIn: true, activeTab, showToast: (toast: Toast) => toasts.push(toast), confirm, gateway });
  return { hook, client, toasts, calls, observers, close() { observers.forEach((observer) => observer.destroy()); client.clear(); } };
}

const failedRefresh = fixture({ getPages: async () => { throw new Error('최신 조회 실패'); } });
await failedRefresh.hook.handleTogglePublished(page as never, true);
assert.equal(failedRefresh.calls.includes('publish'), true);
assert.equal(failedRefresh.toasts.at(-1)?.tone, 'info', 'A successful write with failed refresh must explain that the change was saved.');
assert.match(failedRefresh.toasts.at(-1)?.title ?? '', /저장/);
assert.equal(failedRefresh.toasts.some((toast) => toast.tone === 'error'), false);
assert.equal(failedRefresh.observers[1].getCurrentResult().isError, true);
assert.equal(failedRefresh.calls.includes('summary'), false, 'Hidden summary queries must only be invalidated.');
failedRefresh.toasts.length = 0;
assert.equal(await failedRefresh.hook.refreshPages(), undefined, 'Manual refresh must retain its Promise<void> contract.');
assert.equal(failedRefresh.observers[1].getCurrentResult().isError, true);
assert.equal(failedRefresh.toasts.length, 0, 'Manual query errors must remain available to retry UI.');
failedRefresh.close();

const visibleSummary = fixture({}, 'periods');
await visibleSummary.hook.refreshPages();
assert.equal(visibleSummary.calls.includes('summary'), true);
visibleSummary.close();
const failedWrite = fixture({ setPublished: async () => { throw new Error('저장 거절'); } });
await failedWrite.hook.handleTogglePublished(page as never, true);
assert.equal(failedWrite.toasts.at(-1)?.tone, 'error', 'A failed write must remain a mutation error.');
failedWrite.close();

for (const [result, expectedTone] of [
  [{ success: false, deletionStatus: 'failed', retryable: true }, 'error'],
  [{ success: true }, 'error'],
  [{ success: true, deletionStatus: 'completed' }, 'success'],
] as const) {
  const deletion = fixture({ deleteEvent: async () => result });
  await deletion.hook.handleDeletePage(page as never);
  assert.equal(deletion.toasts.at(-1)?.tone, expectedTone, 'Only completed deletion may display deletion success.');
  deletion.close();
}

const inviteFailure = fixture();
inviteFailure.client.setQueryData(inviteQueries.getAdminOwnershipInviteStatusQueryKey(page.slug), { status: 'pending' });
const inviteObserver = new QueryObserver(inviteFailure.client, {
  queryKey: inviteQueries.getAdminOwnershipInviteStatusQueryKey(page.slug), staleTime: Infinity, retry: false,
  queryFn: async () => { throw new Error('연결 상태 재조회 실패'); },
});
const unsubscribeInvite = inviteObserver.subscribe(() => {});
assert.ok(await inviteFailure.hook.handleIssueOwnershipInvite(page.slug), 'The successfully issued link must remain available after failed status refresh.');
assert.equal(inviteFailure.toasts.at(-1)?.tone, 'info', 'An active invite status refresh failure must produce a saved-but-refresh-failed notice.');
unsubscribeInvite();
inviteObserver.destroy();
inviteFailure.close();

const previewFailure = fixture();
previewFailure.client.setQueryData(appQueryKeys.invitationPage(page.slug, 'public'), { published: false });
const previewObserver = new QueryObserver(previewFailure.client, {
  queryKey: appQueryKeys.invitationPage(page.slug, 'public'), staleTime: Infinity, retry: false,
  queryFn: async () => { throw new Error('공개 미리보기 재조회 실패'); },
});
const unsubscribePreview = previewObserver.subscribe(() => {});
await previewFailure.hook.handleTogglePublished(page as never, true);
assert.equal(previewFailure.toasts.at(-1)?.tone, 'info', 'An active public preview refresh error must not be swallowed.');
unsubscribePreview();
previewObserver.destroy();
previewFailure.close();

for (const [method, activeTab, action] of [
  ['getComments', 'comments', 'delete'],
  ['getCustomerAccounts', 'accounts', 'assign'],
  ['getDashboardSummary', 'periods', 'publish'],
] as const) {
  const failed = fixture({ [method]: async () => { throw new Error('후속 조회 실패'); } }, activeTab);
  if (action === 'delete') await failed.hook.handleDeleteComment(comment as never);
  if (action === 'assign') await failed.hook.handleAssignCustomerOwnership('customer-1', page.slug);
  if (action === 'publish') await failed.hook.handleTogglePublished(page as never, true);
  assert.equal(failed.toasts.at(-1)?.tone, 'info', `${method} failures must preserve mutation success and show the refresh warning.`);
  assert.equal(failed.toasts.some((toast) => toast.tone === 'error'), false);
  failed.close();
}

let release: () => void = () => {};
const pending = new Promise<void>((resolve) => { release = resolve; });
let assignments = 0;
const overlapping = fixture({ assignOwnership: async () => { assignments++; await pending; } });
const first = overlapping.hook.handleAssignCustomerOwnership('customer-1', page.slug);
await Promise.resolve();
await overlapping.hook.handleAssignCustomerOwnership('customer-1', page.slug);
await overlapping.hook.handleClearCustomerOwnership(page.slug);
assert.equal(await overlapping.hook.handleIssueOwnershipInvite(page.slug), null);
await overlapping.hook.handleDeleteCustomerAccount('customer-1');
assert.equal(assignments, 1, 'Only one assignment may run while the first request is pending.');
assert.deepEqual(overlapping.calls.filter((call) => ['clear', 'issue', 'delete-customer'].includes(call)), [], 'Related mutations must not race with ownership changes.');
release();
await first;
await overlapping.hook.handleClearCustomerOwnership(page.slug);
assert.equal(overlapping.calls.includes('clear'), true, 'The action lock must release after completion.');
overlapping.close();

let deletions = 0;
let releaseDeletion: () => void = () => {};
const deletionPending = new Promise<void>((resolve) => { releaseDeletion = resolve; });
const deleting = fixture({ deleteComment: async () => { deletions++; await deletionPending; } }, 'comments');
const deletion = deleting.hook.handleDeleteComment(comment as never);
await Promise.resolve();
await deleting.hook.handleDeleteComment(comment as never);
assert.equal(deletions, 1, 'Repeated comment deletion must not send concurrent writes.');
releaseDeletion();
await deletion;
deleting.close();

let approved = false;
const canceled = fixture({}, 'pages', async () => approved);
await canceled.hook.handleTogglePublished(page as never, true);
assert.equal(canceled.calls.includes('publish'), false);
approved = true;
await canceled.hook.handleTogglePublished(page as never, true);
assert.equal(canceled.calls.includes('publish'), true, 'Canceling confirmation must release the action lock.');
canceled.close();
console.log('administrator mutation refresh and concurrency checks passed');
