import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/server/mobileBillingServerService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadBilling(entries: unknown[], apiKey = 'test-server-key', responseOk = true) {
  let fulfillments = 0;
  const transactionIds: string[] = [];
  let requests = 0;
  const exports: Record<string, unknown> = {};
  runInNewContext(source, {
    exports,
    process: { env: { NODE_ENV: 'development', MOBILE_BILLING_ALLOW_MOCK: 'true', REVENUECAT_SERVER_API_KEY: apiKey } },
    fetch: async (url: string, options: { cache: string }) => {
      requests += 1;
      assert.equal(url, 'https://api.revenuecat.com/v1/subscribers/customer-1');
      assert.equal(options.cache, 'no-store');
      return { ok: responseOk, json: async () => ({ subscriber: { non_subscriptions: { ticket_pack_1: entries } } }) };
    },
    require(id: string) {
      if (id === '@/lib/mobileBillingProducts') return { getMobileBillingProductDefinition: () => ({ kind: 'ticketPack', ticketCount: 1 }) };
      if (id === './clientEditorMobileApi') return {
        authorizeMobileClientEditorToken: async () => ({ permissions: { canManageTickets: true }, session: { ownerUid: 'customer-1', eventId: 'event-1' } }),
        hasMobileClientEditorPermission: () => true,
      };
      if (id === './repositories/eventRepository') return {
        resolveStoredEventBySlug: async () => ({ summary: { eventId: 'event-1', slug: 'page', ownerUid: 'customer-1' } }),
      };
      if (id === './repositories/billingFulfillmentRepository') return {
        firestoreBillingFulfillmentRepository: { fulfillTicketPack: async ({ purchase }: { purchase: { transactionId: string } }) => {
          fulfillments += 1;
          transactionIds.push(purchase.transactionId);
          return { ticketCount: 1, applied: false };
        } },
      };
      if (id === './pageTicketServerService') return { getServerPageTicketCount: async () => 1 };
      return {};
    },
  });
  const fulfill = exports.fulfillServerMobileTicketPackPurchase as (purchase: object, slug: string, token: string) => Promise<unknown>;
  return {
    run: (transactionId = 'GPA.verified') => fulfill({ appUserId: 'customer-1', productId: 'ticket_pack_1', transactionId }, 'page', 'session'),
    fulfillments: () => fulfillments,
    transactionIds,
    requests: () => requests,
  };
}

const real = loadBilling([{ id: 'rc-record', store_transaction_id: 'GPA.verified', store: 'play_store', purchase_date: '2026-09-21T00:00:00Z' }]);
await real.run();
assert.equal(real.fulfillments(), 1, 'Actual RC v1 map-key product responses must fulfill');
assert.equal(real.requests(), 1);
await real.run('rc-record');
assert.deepEqual(real.transactionIds, ['GPA.verified', 'GPA.verified'], 'RC history IDs and store callback IDs must use the SAME fulfillment transaction');
await loadBilling([{ id: 'GPA.verified', store: 'play_store' }]).run();
await assert.rejects(loadBilling([{ id: 'rc-only', store: 'play_store' }]).run('rc-only'), /could not be verified/,
  'A RevenueCat alias without a canonical store ID must not create a potentially duplicate lock');

for (const store of ['app_store', 'test_store', 'promotional', undefined]) {
  const other = loadBilling([{ id: 'GPA.verified', product_id: 'ticket_pack_1', store }]);
  await assert.rejects(other.run(), /could not be verified/);
  assert.equal(other.fulfillments(), 0, 'Only verified Google Play transactions can reach fulfillment');
}
const demo = loadBilling([]);
await assert.rejects(demo.run('mock_anything'), /could not be verified/);
assert.equal(demo.fulfillments(), 0, 'Development and the old environment flag cannot bypass verification');
assert.equal(demo.requests(), 0, 'Fabricated demo receipts must be rejected before external verification');
await assert.rejects(loadBilling([], '').run(), /REVENUECAT_SERVER_API_KEY/);
await assert.rejects(loadBilling([], 'key', false).run(), /verification failed/);
await assert.rejects(loadBilling([{ id: 'other', store: 'play_store' }]).run(), /could not be verified/);
await assert.rejects(loadBilling([{ id: 'GPA.verified', product_id: 'wrong_product', store: 'play_store' }]).run(), /could not be verified/);
const refunded = loadBilling([{ id: 'GPA.verified', store: 'play_store', refunded_at: '2026-09-21T01:00:00Z' }]);
await assert.rejects(refunded.run(), /could not be verified/);
console.log('real Google Play server verification checks passed (no external requests)');
