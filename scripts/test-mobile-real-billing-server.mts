import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as products from '../src/lib/mobileBillingProducts.ts';
import * as policy from '../src/lib/invitationProductPolicy.ts';

function load(path: string, requireModule: (id: string) => unknown, globals: Record<string, unknown> = {}) {
  const exports: Record<string, unknown> = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, require: requireModule, Date, process: { env: {} }, Error, console, ...globals });
  return exports;
}

const appUserId = 'customer-1';
const productId = 'page_creation_premium';
const token = 'real-google-purchase-token-for-tests';
const orderId = 'GPA.9999-1234-5678-90123';
const accountHash = createHash('sha256').update(appUserId).digest('hex');
const fulfillmentId = `play_${createHash('sha256').update(token).digest('hex')}`;
const receipt = { appUserId, productId, transactionId: orderId, purchaseToken: token };
const validPurchase = {
  purchaseStateContext: { purchaseState: 'PURCHASED' },
  productLineItem: [{ productId, productOfferDetails: {
    quantity: 1, refundableQuantity: 1, consumptionState: 'CONSUMPTION_STATE_YET_TO_BE_CONSUMED',
  } }],
  purchaseCompletionTime: '2026-11-08T11:00:00Z',
  orderId,
  obfuscatedExternalAccountId: accountHash,
};

let requests = 0;
const verification = load('src/server/googlePlayPurchaseVerifier.ts', id => {
  if (id === 'node:crypto') return { createHash };
  if (id === 'google-auth-library') return { GoogleAuth: class { getAccessToken() { return Promise.resolve('test-token-only'); } } };
  if (id === 'server-only') return {};
  throw new Error('Unexpected import ' + id);
}, {
  AbortSignal,
  fetch: async (url: string, options: { cache: string; headers: { Authorization: string } }) => {
    requests++;
    assert.equal(url, 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/kr.msgnote.mobileinvitation/purchases/productsv2/tokens/' + token);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.Authorization, 'Bearer test-token-only');
    return { ok: true, json: async () => validPurchase };
  },
});
const interpret = verification.interpretGooglePlayPurchase as (payload: object, input: object, options?: { allowConsumed?: boolean }) => { transactionIdentifier: string; purchaseDate: string; purchaseTokenHash: string; alreadyConsumed: boolean };
const verify = verification.verifyGooglePlayOneTimePurchase as (input: object, options?: { allowConsumed?: boolean }) => Promise<{ transactionIdentifier: string; purchaseTokenHash: string; alreadyConsumed: boolean }>;
assert.equal((await verify(receipt)).transactionIdentifier, fulfillmentId);
assert.equal((await verify(receipt)).alreadyConsumed, false);
assert.equal((await verify(receipt)).purchaseTokenHash, createHash('sha256').update(token).digest('hex'));
assert.equal(requests, 2, 'Every purchase must be verified against Google, not a local client claim');
for (const update of [
  { purchaseStateContext: { purchaseState: 'PENDING' } },
  { purchaseStateContext: { purchaseState: 'CANCELLED' } },
  { productLineItem: [{ productId: 'wrong-product' }] },
  { productLineItem: [{ productId, productOfferDetails: { quantity: 2 } }] },
  { productLineItem: [{ productId, productOfferDetails: { refundableQuantity: 0 } }] },
  { productLineItem: [{ productId, productOfferDetails: { consumptionState: 'CONSUMPTION_STATE_CONSUMED' } }] },
  { obfuscatedExternalAccountId: 'wrong-customer' },
  { purchaseCompletionTime: 'invalid' },
]) {
  assert.throws(() => interpret({ ...validPurchase, ...update }, receipt), /verified|계정/);
}
await assert.rejects(verify({ ...receipt, purchaseToken: '' }), /verified/);
await assert.rejects(verify({ ...receipt, transactionId: 'mock_unpaid' }), /verified/);
assert.equal(requests, 2, 'Invalid receipt must fail before external API');
const consumedPurchase = {
  ...validPurchase,
  productLineItem: [{ productId, productOfferDetails: {
    quantity: 1, refundableQuantity: 1, consumptionState: 'CONSUMPTION_STATE_CONSUMED',
  } }],
};
assert.throws(() => interpret(consumedPurchase, receipt), /verified/);
assert.equal(interpret(consumedPurchase, receipt, { allowConsumed: true }).alreadyConsumed, true);
assert.equal(interpret(consumedPurchase, receipt, { allowConsumed: true }).transactionIdentifier, fulfillmentId);
assert.throws(() => interpret({
  ...consumedPurchase, productLineItem: [{ productId, productOfferDetails: {
    quantity: 1, refundableQuantity: 0, consumptionState: 'CONSUMPTION_STATE_CONSUMED',
  } }],
}, receipt, { allowConsumed: true }), /verified/, 'Refunded purchases must not be restored');
assert.throws(() => interpret(consumedPurchase, { ...receipt, appUserId: 'other-user' }, { allowConsumed: true }), /계정/,
  'Consumed receipts must remain bound to the original payer');

let created: { productTier: string; initialDisplayPeriodMonths: number } | undefined;
let fulfilled = 0;
let verifiedCount = 0;
let failedMarks = 0;
let failAfterFulfillment = false;
let consumeOnServer = false;
let pastFulfillment: Record<string, unknown> | null = null;
let lockAcquisitions = 0;
const service = load('src/server/mobileBillingServerService.ts', id => {
  if (id === './googlePlayPurchaseVerifier') return {
    verifyGooglePlayOneTimePurchase: async (input: { productId: string; purchaseToken: string }, options: { allowConsumed?: boolean }) => {
      verifiedCount++;
      assert.equal(input.purchaseToken, token);
      assert.equal(options.allowConsumed, true);
      return { transactionIdentifier: fulfillmentId, productIdentifier: input.productId,
        purchaseDate: '2026-11-08T11:00:00.000Z', purchaseTokenHash: 'hash',
        alreadyConsumed: consumeOnServer };
    },
  };
  if (id === '@/lib/mobileBillingProducts') return products;
  if (id === '@/lib/invitationProductPolicy') return policy;
  if (id === '@/config/weddingPages') return { getAllWeddingPageSeeds: () => [{ slug: 'sample' }] };
  if (id === '@/lib/invitationThemes') return { DEFAULT_INVITATION_THEME: 'simple', isInvitationThemeKey: () => true };
  if (id === './repositories/billingFulfillmentRepository') return { firestoreBillingFulfillmentRepository: {
    acquireLock: async () => { lockAcquisitions++; return { acquired: true, record: { status: 'processing' } }; },
    findByTransactionId: async (id: string) => { assert.equal(id, fulfillmentId); return pastFulfillment; },
    update: async () => { fulfilled++; },
    markFailed: async () => { failedMarks++; },
  } };
  if (id === './repositories/eventRepository') return { firestoreEventRepository: { assignOwnerBySlug: async () => ({ summary: { eventId: 'created-id' } }) } };
  if (id === './invitationPageServerService') return {
    createServerInvitationPageDraftFromSeed: async (input: typeof created) => { created = input; return { slug: 'created-page' }; },
    getServerEditableInvitationPageConfig: async () => ({
      slug: 'created-page', config: { displayName: '청첩장' }, productTier: 'premium',
      published: false, defaultTheme: 'simple',
    }),
    getServerInvitationPageDisplayPeriodSummary: async () => ({
      enabled: true, startDate: new Date('2026-11-08T00:00:00Z'),
      endDate: new Date('2027-05-08T00:00:00Z'),
    }),
  };
  if (id === './clientEditorMobileApi') return {
    createServerBackedMobileClientEditorSession: async () => {
      if (failAfterFulfillment) throw new Error('Simulated post-commit response failure');
      return { value: 'session', expiresAt: '', scopes: [] };
    },
    buildMobileInvitationLinks: () => ({}), resolveMobileClientEditorPermissions: () => ({}),
  };
  if (id === './pageTicketServerService') return { getServerPageTicketCount: async () => 0 };
  return {};
});
const create = service.fulfillServerMobilePageCreationPurchase as (origin: string, receipt: object, options: object) => Promise<unknown>;
await create('https://example.test', receipt, {
  slugBase: 'created-page', groomKoreanName: '신랑', brideKoreanName: '신부', theme: 'simple', ownerUid: appUserId,
});
assert.equal(verifiedCount, 1);
assert.equal(fulfilled, 1);
assert.equal(created?.productTier, 'premium');
assert.equal(created?.initialDisplayPeriodMonths, 6);
failAfterFulfillment = true;
await assert.rejects(create('https://example.test', receipt, {
  slugBase: 'created-page', groomKoreanName: '신랑', brideKoreanName: '신부', theme: 'simple', ownerUid: appUserId,
}), /post-commit response failure/);
assert.equal(failedMarks, 0, 'A successfully recorded page grant must not be downgraded if session response construction fails');

failAfterFulfillment = false;
consumeOnServer = true;
await assert.rejects(create('https://example.test', receipt, {
  slugBase: 'created-page', groomKoreanName: '신랑', brideKoreanName: '신부', theme: 'simple', ownerUid: appUserId,
}), /reconciliation/, 'Unknown consumed tokens must never grant a new page');
const validFulfillment = {
  status: 'fulfilled', kind: 'pageCreation', provider: 'googleplay',
  appUserId, productId, createdPageSlug: 'created-page', eventId: 'created-id',
};
for (const patch of [
  { status: 'failed' }, { status: 'processing' }, { provider: 'revenuecat' },
  { appUserId: 'other-user' }, { productId: 'ticket_pack_1' }, { kind: 'ticketPack' },
  { createdPageSlug: null },
]) {
  pastFulfillment = { ...validFulfillment, ...patch };
  await assert.rejects(create('https://example.test', receipt, {
    slugBase: 'created-page', groomKoreanName: '신랑', brideKoreanName: '신부', theme: 'simple', ownerUid: appUserId,
  }), /reconciliation/, 'Only the matching already-fulfilled Play grant may be restored');
}
pastFulfillment = validFulfillment;
const priorLocks = lockAcquisitions;
const priorGrants = fulfilled;
const replay = await create('https://example.test', receipt, {
  slugBase: 'created-page', groomKoreanName: '신랑', brideKoreanName: '신부', theme: 'simple', ownerUid: appUserId,
}) as { billingPurchaseConsumed: boolean; page: { slug: string } };
assert.equal(replay.billingPurchaseConsumed, true, 'Tell the client not to re-consume a completed purchase');
assert.equal(replay.page.slug, 'created-page');
assert.equal(lockAcquisitions, priorLocks, 'A consumed replay may not acquire a new grant lock');
assert.equal(fulfilled, priorGrants, 'A consumed replay may not issue a second grant');
console.log('Google Play token verification, six-month grants and consumed-token replay safety checks passed');
