import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('apps/mobile/src/lib/pendingBillingPurchase.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let stored: string | null = null;
let purchases = 0;
let failReceiptStorage = false;
let history: { productIdentifier: string; transactionIdentifier: string; purchaseDate: string }[] = [];
let historyRequestDate = new Date().toISOString();
function loadModule() {
  const exports: Record<string, unknown> = {};
  runInNewContext(source, { exports, require: (id: string) => id === './billing' ? ({
    getBillingTransactionHistory: async () => ({ transactions: history, requestDate: historyRequestDate }),
    isDefinitelyUnchargedBillingError: (error: { userCancelled?: boolean }) => error?.userCancelled === true,
  }) : ({
    getStoredString: async () => stored,
    setStoredString: async (_key: string, value: string | null) => {
      if (value && failReceiptStorage) throw new Error('storage unavailable');
      stored = value;
    },
  }) });
  return exports as {
    runPendingBillingPurchase: (request: object, options: object) => Promise<unknown>;
    getPendingBillingRequest: (scope: object) => Promise<{ target: { input: { slugBase: string } } } | null>;
    recoverPendingBillingPurchase: (scope: object, fulfill: (request: { target: { input: { slugBase: string } } }, receipt: { transactionId: string }) => Promise<unknown>) => Promise<unknown>;
  };
}
function load() { return loadModule().runPendingBillingPurchase; }
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
const failedStorage = load();
failReceiptStorage = true;
await assert.rejects(failedStorage(request, { purchase, fulfill: async () => 1 }), /저장|storage/);
const afterFailure = purchases;
failReceiptStorage = false;
assert.equal(stored, null, 'Failure to persist the purchase intent must stop before opening the store');
await failedStorage(request, { purchase, fulfill: async () => 1 });
assert.equal(purchases, afterFailure + 1);
const createRequest = { ...request, target: { action: 'createInvitationPage', input: { slugBase: 'pair', theme: 'simple' } } };
const create = load();
await assert.rejects(create(createRequest, { purchase, fulfill: async () => false }), /다시/);
await assert.rejects(create({ ...createRequest, target: { action: 'createInvitationPage', input: { slugBase: 'other', theme: 'simple' } } }, { purchase, fulfill: async () => true }), /미처리/);
await create({ ...createRequest, target: { action: 'createInvitationPage', input: { theme: 'simple', unused: undefined, slugBase: 'pair' } } }, { purchase, fulfill: async () => true });
const recovery = loadModule();
await assert.rejects(recovery.runPendingBillingPurchase(createRequest, { purchase, fulfill: async () => false }), /다시/);
const paidCount = purchases;
const scope = { appUserId: 'customer', apiBaseUrl: 'https://example.test' };
assert.equal(await recovery.getPendingBillingRequest({ ...scope, appUserId: 'other' }), null);
assert.equal(await recovery.getPendingBillingRequest({ ...scope, apiBaseUrl: 'https://other.test' }), null);
await assert.rejects(recovery.recoverPendingBillingPurchase({ ...scope, appUserId: 'other' }, async () => true), /결제한 계정/);
await assert.rejects(recovery.recoverPendingBillingPurchase({ ...scope, apiBaseUrl: 'https://other.test' }, async () => true), /결제한 계정/);
const preview = await recovery.getPendingBillingRequest(scope);
assert.ok(preview);
preview.target.input.slugBase = 'edited-preview';
await assert.rejects(recovery.recoverPendingBillingPurchase(scope, async () => { throw new Error('offline'); }), /다시/);
await recovery.recoverPendingBillingPurchase(scope, async (original, receipt) => {
  assert.equal(original.target.input.slugBase, 'pair', 'Recovery must use the original paid input, never edited form or preview data');
  assert.equal(receipt.transactionId, 'GPA.paid');
  return true;
});
assert.equal(purchases, paidCount, 'Explicit recovery never opens another purchase');
assert.equal(stored, null);
await assert.rejects(recovery.recoverPendingBillingPurchase(scope, async () => true), /결제가 없습니다/);

// Store approval can terminate the process before its promise returns an order ID.
history = [{ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-old', purchaseDate: '2026-01-01T00:00:00Z' }];
historyRequestDate = '2026-09-21T10:00:00.900Z';
const beforeCrash = purchases;
void load()(request, { purchase: async () => { purchases++; return new Promise(() => {}); }, fulfill: async () => 1 });
await new Promise(resolve => setTimeout(resolve, 0));
assert.ok(stored, 'The paid target and pre-purchase transaction baseline must survive before the store callback');
const crashIntent = stored;
assert.equal(purchases, beforeCrash + 1);
const afterCrash = loadModule();
await assert.rejects(afterCrash.recoverPendingBillingPurchase(scope, async () => { throw new Error('must not fulfill historical purchase'); }), /확인|거래/);
assert.equal(purchases, beforeCrash + 1, 'Uncertain payment must never open another charge');
history.push({ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-new', purchaseDate: '2026-09-21T10:00:00Z' });
let recoveredTransaction = '';
await afterCrash.recoverPendingBillingPurchase(scope, async (_request, receipt) => { recoveredTransaction = receipt.transactionId; return true; });
assert.equal(recoveredTransaction, 'rc-new', 'Use server snapshot time and second precision despite the device clock skew');
assert.equal(stored, null);
assert.equal(purchases, beforeCrash + 1);
stored = crashIntent;
history.push({ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-second-new', purchaseDate: new Date().toISOString() });
await assert.rejects(loadModule().recoverPendingBillingPurchase(scope, async () => { throw new Error('ambiguous target'); }), /확정/);
assert.equal(stored, crashIntent, 'Ambiguous histories must keep the pending intent for investigation');
history = [{ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-unseen-old', purchaseDate: '2025-01-01T00:00:00Z' }];
await assert.rejects(loadModule().recoverPendingBillingPurchase(scope, async () => true), /확정/);
assert.equal(purchases, beforeCrash + 1);
stored = null;
const receiptFailure = load();
await assert.rejects(receiptFailure(request, { purchase: async () => { const paid = await purchase(); failReceiptStorage = true; return paid; }, fulfill: async () => 1 }), /앱을 닫지/);
const afterReceiptFailure = purchases;
failReceiptStorage = false;
await receiptFailure(request, { purchase, fulfill: async () => 1 });
assert.equal(purchases, afterReceiptFailure, 'A paid receipt in memory must survive a failed receipt write');
const cancelledPurchase = load();
await assert.rejects(cancelledPurchase(request, { purchase: async () => { throw { userCancelled: true }; }, fulfill: async () => 1 }));
assert.equal(stored, null, 'Definitive cancellation allows a later fresh purchase');
console.log('pending billing purchase recovery checks passed (no payments)');
