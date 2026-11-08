import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import {
  INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS,
  INVITATION_EXTENSION_PRICE_KRW,
  getInvitationDisplayPeriodEnd,
} from '../src/lib/invitationProductPolicy';
import {
  MOBILE_BILLING_PRODUCT_IDS,
  isMobileBillingProductId,
} from '../src/lib/mobileBillingProducts';

assert.equal(INVITATION_EXTENSION_PRICE_KRW, 5000);
assert.equal(INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS, 6);
assert.deepEqual(MOBILE_BILLING_PRODUCT_IDS, ['page_creation_premium']);
assert.equal(isMobileBillingProductId('ticket_pack_1'), true, 'Previously charged tickets must remain verifiable');

const read = (path: string) => readFileSync(path, 'utf8');
const create = read('apps/mobile/src/app/(tabs)/create.tsx');
const manage = read('apps/mobile/src/features/screens/manage.tsx');
const renewal = read('apps/mobile/src/features/manage/components/PeriodExtensionModal.tsx');
const guide = read('apps/mobile/src/constants/content.ts');
const bill = read('apps/mobile/src/lib/billing.ts');
const route = read('src/app/api/mobile/billing/fulfill/route.ts');
const service = read('src/server/mobileBillingServerService.ts');

for (const source of [create, manage, renewal, guide]) {
  assert.doesNotMatch(source, /티켓 구매|티켓 사용|보유 티켓|ticket_pack_/, 'No ticket sale may remain in the customer UI');
}
assert.doesNotMatch(renewal, /INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS/);
assert.doesNotMatch(renewal, /INVITATION_PREMIUM_PRICE_LABEL/);
assert.match(manage, /onRecoverPendingPurchase=\{openExtensionModal\}/);
assert.doesNotMatch(manage, /handlePurchaseExtension|onOpenPeriodExtension=/);
assert.match(bill, /MOBILE_BILLING_PRODUCT_IDS\.includes\(productId\)/);
assert.doesNotMatch(renewal, /onPurchase|5,000원 결제로 6개월 연장/);
assert.match(service, /assertLegacyPaidTransactionDate\(verifiedTransaction\.purchaseDate\)/);
assert.match(route, /verifyCustomerRequest\(request, \{ requireVerified: true \}\)/);
assert.match(route, /getCustomerEventOwnershipSnapshot\(customer\.uid, targetPageSlug\)/);
assert.match(route, /canOpenOwnedWeddingPage\(ownership, targetPageSlug\)/);
assert.match(route, /if \(error instanceof CustomerApiAuthError\)/);
assert.match(service, /verifyRevenueCatNonSubscriptionTransaction\(purchase\)/);

type Data = Record<string, unknown>;
const records = new Map<string, Data>();
const startsAt = new Date('2026-02-01T00:00:00Z');
const endsAt = new Date('2027-01-31T00:00:00Z');
const seedEvent = (endDate = endsAt) => ({
  eventId: 'event1', slug: 'page-a', eventType: 'wedding',
  ownerUid: 'owner-a', version: 1, deletion: null,
  displayPeriod: { isActive: true, startDate: startsAt, endDate },
  stats: { commentCount: 3, ticketBalance: 4, ticketCount: 4 },
  visibility: { published: true, displayStartAt: startsAt, displayEndAt: endDate },
});
records.set('events/event1', seedEvent());
let queue: Promise<unknown> = Promise.resolve();
let writes = 0;

const mockDb = {
  collection(name: string) {
    return { doc(id: string) { return { path: name + '/' + id, id }; } };
  },
  runTransaction<T>(work: (tx: {
    get: (ref: { path: string; id: string }) => Promise<{ exists: boolean; id: string; data: () => Data }>;
    set: (ref: { path: string }, data: Data, options?: { merge?: boolean }) => void;
  }) => Promise<T>) {
    const running = queue.then(async () => {
      const staged = new Map<string, Data>();
      const tx = {
        async get(ref: { path: string; id: string }) {
          const data = staged.get(ref.path) ?? records.get(ref.path);
          return { exists: Boolean(data), id: ref.id, data: () => data ?? {} };
        },
        set(ref: { path: string }, data: Data, options?: { merge?: boolean }) {
          staged.set(ref.path, options?.merge
            ? { ...records.get(ref.path), ...data }
            : data);
        },
      };
      const result = await work(tx);
      for (const [key, value] of staged) {
        records.set(key, value);
        writes++;
      }
      return result;
    });
    queue = running.catch(() => undefined);
    return running;
  },
};

const compiled = ts.transpileModule(read('src/server/repositories/billingFulfillmentRepository.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports: Record<string, unknown> = {};
runInNewContext(compiled, {
  exports,
  require(name: string) {
    if (name === '../firebaseAdmin') return { getServerFirestore: () => mockDb };
    if (name === '../eventDeletionPolicy') return { isEventDeletionBlockingAccess: (deletion: Data | null) => Boolean(deletion?.status) };
    if (name === './eventRepository') return { EVENTS_COLLECTION: 'events' };
    if (name === './eventReadThroughDtos') return { normalizeEventSummaryRecord: (_id: string, value: Data) => value };
    if (name === '@/lib/invitationProductPolicy') return { getInvitationDisplayPeriodEnd, INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS };
    return {};
  },
});
type ExtensionInput = {
  purchase: { appUserId: string; productId: string; transactionId: string };
  eventId: string; targetPageSlug: string; ownerUid: string; purchaseDate: string;
};
const repo = (exports.firestoreBillingFulfillmentRepository as {
  fulfillPeriodExtension: (input: ExtensionInput) => Promise<{
    enabled: boolean; startDate: Date; endDate: Date; applied: boolean;
  }>;
});
const input = (transactionId: string): ExtensionInput => ({
  purchase: { appUserId: 'owner-a', productId: 'page_creation_premium', transactionId },
  eventId: 'event1', targetPageSlug: 'page-a',
  ownerUid: 'owner-a', purchaseDate: new Date().toISOString(),
});

const [first, replay] = await Promise.all([
  repo.fulfillPeriodExtension(input('GPA.test-renew-1')),
  repo.fulfillPeriodExtension(input('GPA.test-renew-1')),
]);
assert.equal(first.applied, true);
assert.equal(replay.applied, false);
assert.equal(first.endDate.toISOString(), '2027-07-31T00:00:00.000Z');
assert.equal(replay.endDate.toISOString(), first.endDate.toISOString());
assert.equal(records.get('events/event1')?.version, 2);
assert.deepEqual(records.get('events/event1')?.stats, {
  commentCount: 3, ticketBalance: 4, ticketCount: 4,
}, 'Period renewals must not create, remove or move tickets');

const receipt = records.get('billingFulfillments/GPA.test-renew-1');
assert.equal(receipt?.kind, 'periodExtension');
assert.equal(receipt?.status, 'fulfilled');
const afterFirst = writes;
records.set('events/event2', { ...seedEvent(), eventId: 'event2', slug: 'page-b' });
await assert.rejects(repo.fulfillPeriodExtension({
  ...input('GPA.test-renew-1'), eventId: 'event2', targetPageSlug: 'page-b',
}), /different purpose or invitation/);
assert.equal(writes, afterFirst);

records.set('billingFulfillments/GPA.used-to-create', {
  ...input('GPA.used-to-create').purchase,
  kind: 'pageCreation', targetPageSlug: 'page-a', status: 'fulfilled',
});
await assert.rejects(
  repo.fulfillPeriodExtension(input('GPA.used-to-create')),
  /different purpose or invitation/,
  'Creation receipt cannot be re-used for an extension'
);
await assert.rejects(repo.fulfillPeriodExtension({
  ...input('GPA.unauthorized'), ownerUid: 'owner-b',
}), /owned invitation|required|no longer owns/);
assert.equal(records.has('billingFulfillments/GPA.unauthorized'), false);

records.set('events/event1', seedEvent(new Date('2025-01-31T00:00:00.000Z')));
const beforeExpired = new Date();
const expired = await repo.fulfillPeriodExtension(input('GPA.expired-renew'));
const lower = getInvitationDisplayPeriodEnd(beforeExpired, 6).getTime();
const upper = getInvitationDisplayPeriodEnd(new Date(), 6).getTime();
assert.ok(expired.endDate.getTime() >= lower && expired.endDate.getTime() <= upper,
  'Expired invitation should renew from now, not the past end date');
assert.equal(records.get('events/event1')?.version, 2);

console.log('Stage 11: 5,000 KRW single creation SKU, retired new renewal purchase and historic receipt atomic safety passed');
