import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('src/server/mobileBillingServerService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadBilling(entries: unknown[], apiKey = 'test-server-key', responseOk = true) {
  let locks = 0;
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
      if (id === './repositories/billingFulfillmentRepository') return {
        firestoreBillingFulfillmentRepository: { acquireLock: async () => {
          locks += 1;
          return { acquired: false, record: { status: 'fulfilled' } };
        } },
      };
      if (id === './pageTicketServerService') return { getServerPageTicketCount: async () => 1 };
      return {};
    },
  });
  const fulfill = exports.fulfillServerMobileTicketPackPurchase as (purchase: object, slug: string, token: string) => Promise<unknown>;
  return {
    run: (transactionId = 'GPA.verified') => fulfill({ appUserId: 'customer-1', productId: 'ticket_pack_1', transactionId }, 'page', 'session'),
    locks: () => locks,
    requests: () => requests,
  };
}

const real = loadBilling([{ id: 'rc-record', store_transaction_id: 'GPA.verified', store: 'play_store', purchase_date: '2026-09-21T00:00:00Z' }]);
await real.run();
assert.equal(real.locks(), 1, 'Actual RC v1 map-key product responses must fulfill');
assert.equal(real.requests(), 1);
await assert.rejects(real.run('rc-record'), /could not be verified/, 'The RC alias must not create a second fulfillment lock');
assert.equal(real.locks(), 1);
await loadBilling([{ id: 'GPA.verified', store: 'play_store' }]).run();

for (const store of ['app_store', 'test_store', 'promotional', undefined]) {
  const other = loadBilling([{ id: 'GPA.verified', product_id: 'ticket_pack_1', store }]);
  await assert.rejects(other.run(), /could not be verified/);
  assert.equal(other.locks(), 0, 'Only verified Google Play transactions can reach fulfillment');
}
const demo = loadBilling([]);
await assert.rejects(demo.run('mock_anything'), /could not be verified/);
assert.equal(demo.locks(), 0, 'Development and the old environment flag cannot bypass verification');
assert.equal(demo.requests(), 0, 'Fabricated demo receipts must be rejected before external verification');
await assert.rejects(loadBilling([], '').run(), /REVENUECAT_SERVER_API_KEY/);
await assert.rejects(loadBilling([], 'key', false).run(), /verification failed/);
await assert.rejects(loadBilling([{ id: 'other', store: 'play_store' }]).run(), /could not be verified/);
await assert.rejects(loadBilling([{ id: 'GPA.verified', product_id: 'wrong_product', store: 'play_store' }]).run(), /could not be verified/);
const refunded = loadBilling([{ id: 'GPA.verified', store: 'play_store', refunded_at: '2026-09-21T01:00:00Z' }]);
await assert.rejects(refunded.run(), /could not be verified/);
console.log('real Google Play server verification checks passed (no external requests)');
