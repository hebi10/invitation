import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as billingProducts from '../src/lib/mobileBillingProducts.ts';
import * as productPolicy from '../src/lib/invitationProductPolicy.ts';

const source = ts.transpileModule(readFileSync('apps/mobile/src/lib/billing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const sku = 'page_creation_premium';
type Purchase = { id: string; productId: string; purchaseToken: string; purchaseState: string; store: string; transactionDate: number };
function fixture(overrides: { os?: string; price?: number; currency?: string; missing?: boolean; cancelled?: boolean; pending?: boolean } = {}) {
  const calls: string[] = [];
  let onPurchase: ((value: Purchase) => void) | undefined;
  let onError: ((value: { code: string }) => void) | undefined;
  const paid: Purchase = {
    id: 'GPA.test.123',
    productId: sku,
    purchaseToken: 'valid-store-token',
    purchaseState: 'purchased',
    store: 'google',
    transactionDate: Date.parse('2026-11-08T00:00:00Z'),
  };
  let owned = [paid];
  const sdk = {
    initConnection: async () => { calls.push('connect'); return true; },
    purchaseUpdatedListener: (callback: (purchase: Purchase) => void) => { onPurchase = callback; return { remove() {} }; },
    purchaseErrorListener: (callback: (error: { code: string }) => void) => { onError = callback; return { remove() {} }; },
    fetchProducts: async () => {
      calls.push('products');
      return overrides.missing ? [] : [{ id: sku, store: 'google', price: overrides.price ?? 5000, currency: overrides.currency ?? 'KRW' }];
    },
    getAvailablePurchases: async () => { calls.push('history'); return owned; },
    requestPurchase: async ({ request }: { request: { google: { obfuscatedAccountId: string } } }) => {
      calls.push('purchase');
      assert.equal(request.google.obfuscatedAccountId,
        createHash('sha256').update('customer-1').digest('hex'), 'Do not send plain user IDs to Google Play');
      queueMicrotask(() => {
        if (overrides.cancelled) onError?.({ code: 'user-cancelled' });
        else onPurchase?.({ ...paid, purchaseState: overrides.pending ? 'pending' : 'purchased' });
      });
    },
    finishTransaction: async ({ isConsumable, purchase }: { isConsumable: boolean; purchase: Purchase }) => {
      calls.push('finish');
      assert.equal(isConsumable, true);
      assert.equal(purchase.purchaseToken, paid.purchaseToken);
      owned = [];
    },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(source, {
    exports,
    process: { env: {} },
    Error,
    Date,
    Promise,
    queueMicrotask,
    require(id: string) {
      if (id === './mobileBillingProducts') return billingProducts;
      if (id === './invitationProductPolicy') return productPolicy;
      if (id === 'react-native') return { Platform: { OS: overrides.os ?? 'android' } };
      if (id === 'expo-crypto') return {
        CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
        digestStringAsync: async (_algorithm: string, raw: string) => createHash('sha256').update(raw).digest('hex'),
      };
      if (id === 'expo-iap') return sdk;
      if (id === './storage') return { getStoredString: async () => 'customer-1', setStoredString: async () => {} };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return {
    calls,
    purchase: exports.purchaseBillingProduct as (id: string, options: { appUserId: string }) => Promise<{ purchaseToken: string; transactionIdentifier: string }>,
    history: exports.getBillingTransactionHistory as (options: { appUserId: string }) => Promise<{ transactions: Array<{ purchaseToken: string }> }>,
    finish: exports.finishBillingPurchase as (token: string) => Promise<void>,
    uncharged: exports.isDefinitelyUnchargedBillingError as (value: unknown) => boolean,
  };
}

const good = fixture();
const receipt = await good.purchase(sku, { appUserId: 'customer-1' });
assert.equal(receipt.purchaseToken, 'valid-store-token', 'Use Play purchase token for backend verification');
assert.equal(receipt.transactionIdentifier, 'GPA.test.123');
assert(good.calls.includes('purchase'));
await good.finish(receipt.purchaseToken);
assert.equal(good.calls.filter(x => x === 'finish').length, 1, 'Finish the consumable after server fulfillment');
assert.equal((await good.history({ appUserId: 'customer-1' })).transactions.length, 0);

const cancelled = fixture({ cancelled: true });
await assert.rejects(cancelled.purchase(sku, { appUserId: 'customer-1' }), /취소/);
assert(cancelled.uncharged(await cancelled.purchase('ticket_pack_1', { appUserId: 'customer-1' }).catch(e => e)));
const pending = fixture({ pending: true });
await assert.rejects(pending.purchase(sku, { appUserId: 'customer-1' }), /대기/);
assert(!pending.calls.includes('finish'), 'Pending payment must not be consumed');

for (const input of [{ price: 9000 }, { currency: 'USD' }, { missing: true }, { os: 'web' }]) {
  const runtime = fixture(input);
  await assert.rejects(runtime.purchase(sku, { appUserId: 'customer-1' }));
  assert(!runtime.calls.includes('purchase'), 'Incorrect products and platforms cannot charge');
}
const history = fixture();
assert.equal((await history.history({ appUserId: 'customer-1' })).transactions[0].purchaseToken, 'valid-store-token');
console.log('Direct Google Play Billing client checks passed (no real charge)');
