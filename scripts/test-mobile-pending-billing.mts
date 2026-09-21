import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('apps/mobile/src/lib/pendingBillingPurchase.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let stored: string | null = null;
let purchases = 0;
function load() {
  const exports: Record<string, unknown> = {};
  runInNewContext(source, { exports, require: () => ({
    getStoredString: async () => stored,
    setStoredString: async (_key: string, value: string | null) => { stored = value; },
  }) });
  return exports.runPendingBillingPurchase as (request: object, options: object) => Promise<unknown>;
}
const request = { appUserId: 'customer', productId: 'ticket_pack_1', apiBaseUrl: 'https://example.test', target: { action: 'grantTicketPack', pageSlug: 'page' } };
const purchase = async () => {
  purchases += 1;
  return { appUserId: 'customer', productIdentifier: 'ticket_pack_1', transactionIdentifier: 'GPA.paid', customerInfo: { secret: 'not-persisted' } };
};
const initial = load();
await assert.rejects(initial(request, { purchase, fulfill: async () => { throw new Error('offline'); } }), /다시/);
assert.equal(purchases, 1);
assert.ok(stored?.includes('GPA.paid'));
assert.ok(!stored?.includes('secret'), 'Only the minimal receipt and target may be persisted');
const restarted = load();
await assert.rejects(restarted({ ...request, target: { action: 'grantTicketPack', pageSlug: 'another' } }, { purchase, fulfill: async () => 1 }), /미처리/);
await assert.rejects(restarted({ ...request, appUserId: 'another' }, { purchase, fulfill: async () => 1 }), /미처리/);
await assert.rejects(restarted({ ...request, productId: 'ticket_pack_3' }, { purchase, fulfill: async () => 1 }), /미처리/);
assert.equal(purchases, 1);
await assert.rejects(restarted(request, { purchase, fulfill: async () => false }), /다시/);
assert.ok(stored);
assert.equal(await restarted(request, { purchase, fulfill: async (receipt: { transactionId: string }) => { assert.equal(receipt.transactionId, 'GPA.paid'); return 4; } }), 4);
assert.equal(purchases, 1, 'Retry must reuse the paid transaction after restarting');
assert.equal(stored, null, 'Only a successful fulfillment clears the purchase');
stored = '{broken';
await assert.rejects(load()(request, { purchase, fulfill: async () => 1 }), /확인/);
assert.equal(purchases, 1, 'Corrupt pending data must not trigger another charge');
stored = null;
let release: (() => void) | undefined;
const concurrent = load();
const first = concurrent(request, { purchase: async () => { await new Promise<void>((resolve) => { release = resolve; }); return purchase(); }, fulfill: async () => 1 });
await new Promise((resolve) => setTimeout(resolve, 0));
await assert.rejects(concurrent(request, { purchase, fulfill: async () => 1 }), /진행/);
release?.();
await first;
console.log('pending billing purchase recovery checks passed (no payments)');
