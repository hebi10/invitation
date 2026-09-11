import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { resolveCustomerEventClaimState } from '../src/server/customerEventClaimPolicy.ts';
import {
  CustomerEventClaimError,
  claimCustomerEventOwnership,
} from '../src/server/customerEventsService.ts';

const adminUserIds = new Set(['admin-1']);

assert.equal(
  resolveCustomerEventClaimState({
    currentOwnerUid: null,
    claimantUid: 'customer-1',
    adminUserIds,
  }),
  'claimable',
  'an unassigned administrator-created event should be claimable'
);

assert.equal(
  resolveCustomerEventClaimState({
    currentOwnerUid: 'admin-1',
    claimantUid: 'customer-1',
    adminUserIds,
  }),
  'claimable',
  'a legacy administrator-owned event should be claimable'
);

assert.equal(
  resolveCustomerEventClaimState({
    currentOwnerUid: 'customer-1',
    claimantUid: 'customer-1',
    adminUserIds,
  }),
  'owner',
  'the current customer owner should remain the owner'
);

assert.equal(
  resolveCustomerEventClaimState({
    currentOwnerUid: 'customer-2',
    claimantUid: 'customer-1',
    adminUserIds,
  }),
  'different-owner',
  'a different customer owner must never be overwritten'
);

const claimCalls: unknown[] = [];
const readySnapshot = {
  status: 'ready' as const,
  summary: { slug: 'test-test' },
  config: { slug: 'test-test' },
};
const claimed = await claimCustomerEventOwnership('customer-1', 'test-test', {
  isAdminUserEnabled: async () => false,
  getCustomerIdentity: async () => ({
    uid: 'customer-1',
    email: 'customer@example.test',
    displayName: '고객',
  }),
  claimOwnerBySlug: async (input) => {
    claimCalls.push(input);
  },
  getEditableSnapshot: async () => readySnapshot as never,
});

assert.equal(claimed.status, 'ready');
assert.deepEqual(claimCalls, [
  {
    pageSlug: 'test-test',
    customer: {
      uid: 'customer-1',
      email: 'customer@example.test',
      displayName: '고객',
    },
  },
]);

await assert.rejects(
  () =>
    claimCustomerEventOwnership('admin-1', 'test-test', {
      isAdminUserEnabled: async () => true,
      getCustomerIdentity: async () => ({
        uid: 'admin-1',
        email: 'admin@example.test',
        displayName: '관리자',
      }),
      claimOwnerBySlug: async () => undefined,
      getEditableSnapshot: async () => readySnapshot as never,
    }),
  (error: unknown) =>
    error instanceof CustomerEventClaimError && error.status === 403
);

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8');
const ownershipRoute = readSource(
  'src/app/api/customer/events/[slug]/ownership/route.ts'
);
const creationRoute = readSource('src/app/api/customer/events/route.ts');
const dashboard = readSource('src/app/my-invitations/MyInvitationsClient.tsx');
const creationScreen = readSource('src/app/my-invitations/create/CreateInvitationClient.tsx');

assert.match(ownershipRoute, /export async function POST/);
assert.match(ownershipRoute, /await verifyCustomerUid\(request\)/);
assert.match(ownershipRoute, /status: 403/);
assert.doesNotMatch(ownershipRoute, /claimCustomerEventOwnership/);
assert.match(creationRoute, /await verifyCustomerRequest\(request\)/);
assert.match(creationRoute, /status: 403/);
assert.doesNotMatch(creationRoute, /createCustomerInvitationPageFromWalletCredit/);
assert.doesNotMatch(dashboard, /handleCreateEvent|creationBalance|pageCreationCredits/);
assert.doesNotMatch(creationScreen, /createOwnedCustomerEvent|PRODUCT_TIERS/);
assert.match(creationScreen, /isAdminLoggedIn \?/);

console.log('customer event self-claim restrictions passed');
