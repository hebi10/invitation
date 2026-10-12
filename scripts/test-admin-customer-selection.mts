import assert from 'node:assert/strict';
import { getCustomerAssignmentConfirmation } from '../src/lib/adminCustomerSelection.ts';
import { QueryClient, QueryObserver } from '@tanstack/query-core';
import { getAdminOwnershipInviteStatusQueryOptions, invalidateAdminOwnershipInviteStatus } from '../src/app/admin/_hooks/adminOwnershipInviteQuery.ts';

const accounts = [
  { uid: 'one', displayName: '동일 이름', email: 'first@example.test' },
  { uid: 'two', displayName: '동일 이름', email: 'second@example.test' },
  { uid: 'disabled', email: 'disabled@example.test', disabled: true },
  { uid: 'admin', email: 'admin@example.test', isAdmin: true },
  { uid: 'orphan', missingAuthUser: true },
];
for (const uid of ['', 'missing', 'disabled', 'admin', 'orphan']) {
  assert.equal(getCustomerAssignmentConfirmation(accounts, uid, '샘플 행사', 'sample'), null);
}
const confirmation = getCustomerAssignmentConfirmation(accounts, 'two', '샘플 행사', 'sample');
assert.ok(confirmation?.includes('second@example.test'));
assert.ok(!confirmation?.includes('first@example.test'));
assert.ok(confirmation?.includes('샘플 행사 (sample)'));
console.log('고객 연결 대상 확인 검증 통과');

const queryClient = new QueryClient();
queryClient.setQueryData(['admin-ownership-invite-status', 'one'], { status: 'pending' });
queryClient.setQueryData(['admin-ownership-invite-status', 'two'], { status: 'pending' });
await invalidateAdminOwnershipInviteStatus(queryClient, 'one');
assert.equal(queryClient.getQueryState(['admin-ownership-invite-status', 'one'])?.isInvalidated, true, 'an ownership change must invalidate the selected event invite status');
assert.equal(queryClient.getQueryState(['admin-ownership-invite-status', 'two'])?.isInvalidated, false, 'an ownership change must leave unrelated event status caches intact');
queryClient.clear();

const experienceQueryClient = new QueryClient();
const experienceObserver = new QueryObserver(experienceQueryClient, {
  ...getAdminOwnershipInviteStatusQueryOptions('demo-event', true),
  queryFn: async () => ({ status: 'pending' }),
});
const unsubscribeExperience = experienceObserver.subscribe(() => {});
assert.equal(experienceObserver.getCurrentResult().fetchStatus, 'idle', 'experience ownership status must not start an authenticated production request');
assert.equal(experienceQueryClient.getQueryData(['admin-ownership-invite-status', 'demo-event']), undefined, 'experience mode must not display production ownership status');
unsubscribeExperience();
experienceQueryClient.clear();

const productionQueryClient = new QueryClient();
const productionObserver = new QueryObserver(productionQueryClient, {
  ...getAdminOwnershipInviteStatusQueryOptions('owned-event', false),
  queryFn: async () => ({ status: 'unavailable' }),
});
const unsubscribeProduction = productionObserver.subscribe(() => {});
assert.equal(productionObserver.getCurrentResult().fetchStatus, 'fetching', 'production ownership status must remain available to read-only views');
await productionObserver.refetch();
assert.deepEqual(productionQueryClient.getQueryData(['admin-ownership-invite-status', 'owned-event']), { status: 'unavailable' });
unsubscribeProduction();
productionQueryClient.clear();
