import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('apps/mobile/src/lib/billing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const productId = 'page_creation_premium';
function load(options: { os?: string; key?: string; missingSdk?: boolean; missingNative?: boolean; missingProduct?: boolean; failure?: object; price?: number; currency?: string; transactionId?: string } = {}) {
  const calls: string[] = [];
  const sdk = {
    configure: ({ appUserID }: { appUserID: string }) => calls.push(`configure:${appUserID}`),
    logIn: async (id: string) => { calls.push(`login:${id}`); },
    getProducts: async () => { calls.push('products'); return options.missingProduct ? [] : [{ identifier: productId, price: options.price ?? 9900, currencyCode: options.currency ?? 'KRW' }]; },
    purchaseStoreProduct: async () => {
      calls.push('purchase');
      if (options.failure) throw options.failure;
      return { customerInfo: { originalAppUserId: 'old-alias' }, productIdentifier: productId,
        transaction: { productIdentifier: productId, transactionIdentifier: options.transactionId ?? 'GPA.1234', purchaseDate: '2026-09-21' } };
    },
  };
  const exports: Record<string, unknown> = {};
  const require = (id: string) => {
    if (id === './mobileBillingProducts') return { MOBILE_BILLING_PREMIUM_PRICE_KRW: 9900, MOBILE_BILLING_PRODUCT_IDS: [productId, 'ticket_pack_1', 'ticket_pack_3', 'ticket_pack_6'] };
    if (id === 'react-native') return { Platform: { OS: options.os ?? 'android' }, NativeModules: { RNPurchases: options.missingNative ? null : {} } };
    if (id === 'react-native-purchases') return { default: options.missingSdk ? null : sdk, __esModule: true };
    if (id === './storage') return { getStoredString: async () => 'customer-1', setStoredString: async () => {} };
    throw new Error(`Unexpected module ${id}`);
  };
  runInNewContext(source, { exports, require, process: { env: { NODE_ENV: 'development', EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: options.key ?? 'goog_example' } } });
  return { calls, purchase: exports.purchaseBillingProduct as (id: string, options: { appUserId: string }) => Promise<{ appUserId: string; transactionIdentifier: string }> };
}

for (const options of [{ key: '' }, { key: 'test_example' }, { os: 'web' }, { os: 'ios' }, { missingSdk: true }, { missingNative: true }]) {
  const runtime = load(options);
  await assert.rejects(runtime.purchase(productId, { appUserId: 'customer-1' }), undefined, 'Unavailable Play Billing must never simulate success');
  assert(!runtime.calls.includes('purchase'));
}
const success = load();
const result = await success.purchase(productId, { appUserId: 'customer-1' });
assert.equal(result.appUserId, 'customer-1', 'Return the authenticated billing identity, not a historical alias');
assert.equal(result.transactionIdentifier, 'GPA.1234');
assert.deepEqual(success.calls, ['configure:customer-1', 'products', 'purchase']);
const switched = await success.purchase(productId, { appUserId: 'customer-2' });
assert.equal(switched.appUserId, 'customer-2');
assert.equal(success.calls.filter(call => call.startsWith('configure:')).length, 1);
assert(success.calls.includes('login:customer-2'));
await assert.rejects(load({ missingProduct: true }).purchase(productId, { appUserId: 'customer-1' }));
await assert.rejects(load({ transactionId: '' }).purchase(productId, { appUserId: 'customer-1' }));
const cancelled = { userCancelled: true };
await assert.rejects(load({ failure: cancelled }).purchase(productId, { appUserId: 'customer-1' }), error => error === cancelled);


await assert.rejects(load({ price: 15000 }).purchase(productId, { appUserId: 'customer-1' }));
await assert.rejects(load({ currency: 'USD' }).purchase(productId, { appUserId: 'customer-1' }));

await assert.rejects(load().purchase('page_creation_standard', { appUserId: 'customer-1' }));
await assert.rejects(load().purchase('page_creation_deluxe', { appUserId: 'customer-1' }));
console.log('mobile real billing client checks passed (no purchase made)');
