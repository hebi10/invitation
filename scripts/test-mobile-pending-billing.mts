import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import type {
  MobileInvitationCreationInput,
  MobileInvitationCreationResponse,
} from '../apps/mobile/src/types/mobileInvitation.ts';

const source = ts.transpileModule(readFileSync('apps/mobile/src/lib/pendingBillingPurchase.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const apiCore = ts.transpileModule(readFileSync('apps/mobile/src/lib/apiCore.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const apiExports: Record<string, unknown> = {};
runInNewContext(apiCore, { exports: apiExports, process: { env: {} }, URL, require: () => ({ default: {} }) });
let stored: string | null = null;
let purchases = 0;
let failReceiptStorage = false;
let failClearStorage = false;
let history: { productIdentifier: string; transactionIdentifier: string; purchaseDate: string; purchaseToken?: string }[] = [];
let consumed = 0;
let historyRequestDate = new Date().toISOString();
type BeforeLaunch = () => Promise<void>;
type TestReceipt = { appUserId: string; productId: string; transactionId: string; purchaseToken?: string };
type TestPurchase = (beforeLaunch?: BeforeLaunch) => Promise<{
  appUserId: string;
  productIdentifier: string;
  transactionIdentifier: string;
  purchaseToken?: string;
}>;

function loadModule() {
  const exports: Record<string, unknown> = {};
  runInNewContext(source, { exports, require: (id: string) => id === './billing' ? ({
    getBillingTransactionHistory: async () => ({ transactions: history, requestDate: historyRequestDate }),
    finishBillingPurchase: async (token: string) => { assert.ok(token); consumed += 1; },
    isDefinitelyUnchargedBillingError: (error: { userCancelled?: boolean }) => error?.userCancelled === true,
  }) : id === './apiCore' ? apiExports : ({
    getStoredString: async () => stored,
    setStoredString: async (_key: string, value: string | null) => {
      if ((value && failReceiptStorage) || (value === null && failClearStorage)) throw new Error('storage unavailable');
      stored = value;
    },
  }) });
  return exports as {
    runPendingBillingPurchase: <T>(request: object, options: {
      purchase: TestPurchase;
      fulfill: (receipt: TestReceipt) => Promise<T>;
    }) => Promise<T>;
    getPendingBillingRequest: (scope: object) => Promise<{ target: { input: { slugBase: string } } } | null>;
    recoverPendingBillingPurchase: <T>(scope: object, fulfill: (
      request: { target: { input: { slugBase: string } } },
      receipt: TestReceipt,
    ) => Promise<T>) => Promise<T>;
  };
}
function load() { return loadModule().runPendingBillingPurchase; }
const request = { appUserId: 'customer', productId: 'ticket_pack_1', apiBaseUrl: 'https://example.test', target: { action: 'grantTicketPack', pageSlug: 'page' } };
const purchase = async (beforeLaunch?: BeforeLaunch) => {
  await beforeLaunch?.();
  purchases += 1;
  return { appUserId: 'customer', productIdentifier: 'ticket_pack_1', transactionIdentifier: 'GPA.paid', purchaseToken: 'google-token-paid', customerInfo: { secret: 'not-persisted' } };
};

const preparation = loadModule();
const purchasesBeforePreparation = purchases;
await assert.rejects(preparation.runPendingBillingPurchase(request, {
  purchase: async () => { throw new Error('Play product lookup failed'); },
  fulfill: async () => assert.fail('A failed preparation cannot grant a purchase'),
}), /Play product lookup failed/);
assert.equal(stored, null, 'A failure before launch must not strand a durable pending request');
assert.equal(await preparation.getPendingBillingRequest(request), null, 'A failure before launch must not strand an in-memory pending request');
assert.equal(purchases, purchasesBeforePreparation);
await preparation.runPendingBillingPurchase(request, { purchase, fulfill: async () => true });
assert.equal(purchases, purchasesBeforePreparation + 1, 'The same purchase can be attempted after preparation recovers');
assert.equal(stored, null);

const initial = load();
const purchasesBeforeInitial = purchases;
await assert.rejects(initial(request, { purchase, fulfill: async () => { throw new Error('offline'); } }), /다시/);
assert.equal(purchases, purchasesBeforeInitial + 1);
assert.ok(stored?.includes('GPA.paid'));
assert.ok(!stored?.includes('secret'), 'Only the minimal receipt and target may be persisted');
const restarted = load();
await assert.rejects(restarted({ ...request, target: { action: 'grantTicketPack', pageSlug: 'another' } }, { purchase, fulfill: async () => 1 }), /미처리/);
await assert.rejects(restarted({ ...request, appUserId: 'another' }, { purchase, fulfill: async () => 1 }), /미처리/);
await assert.rejects(restarted({ ...request, productId: 'ticket_pack_3' }, { purchase, fulfill: async () => 1 }), /미처리/);
assert.equal(purchases, purchasesBeforeInitial + 1);
await assert.rejects(restarted(request, { purchase, fulfill: async () => false }), /다시/);
assert.ok(stored);
assert.equal(await restarted(request, { purchase, fulfill: async (receipt: { transactionId: string }) => { assert.equal(receipt.transactionId, 'GPA.paid'); return 4; } }), 4);
assert.equal(purchases, purchasesBeforeInitial + 1, 'Retry must reuse the paid transaction after restarting');
assert.equal(stored, null, 'Only a successful verified fulfillment and consumption clears the purchase');
assert.ok(consumed >= 1, 'Server fulfillment must complete the Play consumable transaction');
stored = '{broken';
await assert.rejects(load()(request, { purchase, fulfill: async () => 1 }), /확인/);
assert.equal(purchases, purchasesBeforeInitial + 1, 'Corrupt pending data must not trigger another charge');
stored = null;
let release: (() => void) | undefined;
const concurrent = load();
const first = concurrent(request, {
  purchase: async (beforeLaunch) => {
    await new Promise<void>((resolve) => { release = resolve; });
    return purchase(beforeLaunch);
  },
  fulfill: async () => 1,
});
await new Promise((resolve) => setTimeout(resolve, 0));
await assert.rejects(concurrent(request, { purchase, fulfill: async () => 1 }), /진행/);
release?.();
await first;
const failedStorage = load();
const beforeFailedStorage = purchases;
failReceiptStorage = true;
await assert.rejects(failedStorage(request, { purchase, fulfill: async () => 1 }), /저장|storage/);
failReceiptStorage = false;
assert.equal(stored, null, 'Failure to persist the purchase intent must stop before opening the store');
assert.equal(purchases, beforeFailedStorage, 'Play must not open if intent storage fails');
await failedStorage(request, { purchase, fulfill: async () => 1 });
assert.equal(purchases, beforeFailedStorage + 1);
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

const oldProductionRequest = { ...createRequest, apiBaseUrl: 'https://msgnote.kr' };
const newProductionRequest = { ...oldProductionRequest, apiBaseUrl: 'https://invite.msgnote.kr' };
await assert.rejects(load()(oldProductionRequest, { purchase, fulfill: async () => false }), /다시/);
const productionPurchaseCount = purchases;
assert.ok(await loadModule().getPendingBillingRequest(newProductionRequest));
assert.equal(await load()(newProductionRequest, { purchase, fulfill: async () => true }), true);
assert.equal(purchases, productionPurchaseCount, 'Migrating the production API must not charge again');

// Store approval can terminate the process before its promise returns an order ID.
history = [{ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-old', purchaseDate: '2026-01-01T00:00:00Z' }];
historyRequestDate = '2026-09-21T10:00:00.900Z';
const beforeCrash = purchases;
void load()(request, {
  purchase: async (beforeLaunch) => {
    await beforeLaunch?.();
    purchases += 1;
    return new Promise(() => {});
  },
  fulfill: async () => 1,
});
await new Promise(resolve => setTimeout(resolve, 0));
assert.ok(stored, 'The paid target and pre-purchase transaction baseline must survive before the store callback');
const crashIntent = stored;
assert.equal(purchases, beforeCrash + 1);
const afterCrash = loadModule();
await assert.rejects(afterCrash.recoverPendingBillingPurchase(scope, async () => { throw new Error('must not fulfill historical purchase'); }), /확인|거래/);
assert.equal(stored, crashIntent, 'An unresolved Play result must preserve the original request');
assert.equal(purchases, beforeCrash + 1, 'Uncertain payment must never open another charge');
history.push({ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-new', purchaseToken: 'google-token-new', purchaseDate: '2026-09-21T10:00:00Z' });
let recoveredTransaction = '';
await afterCrash.recoverPendingBillingPurchase(scope, async (_request, receipt) => { recoveredTransaction = receipt.transactionId; return true; });
assert.equal(recoveredTransaction, 'rc-new', 'Use server snapshot time and second precision despite the device clock skew');
assert.equal(stored, null);
assert.equal(purchases, beforeCrash + 1);
stored = crashIntent;
history.push({ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-second-new', purchaseToken: 'google-token-second', purchaseDate: new Date().toISOString() });
await assert.rejects(loadModule().recoverPendingBillingPurchase(scope, async () => { throw new Error('ambiguous target'); }), /확정/);
assert.equal(stored, crashIntent, 'Ambiguous histories must keep the pending intent for investigation');
history = [{ productIdentifier: 'ticket_pack_1', transactionIdentifier: 'rc-unseen-old', purchaseToken: 'google-token-old', purchaseDate: '2025-01-01T00:00:00Z' }];
await assert.rejects(loadModule().recoverPendingBillingPurchase(scope, async () => true), /확정/);
assert.equal(purchases, beforeCrash + 1);
stored = null;
const receiptFailure = load();
await assert.rejects(receiptFailure(request, {
  purchase: async (beforeLaunch) => {
    const paid = await purchase(beforeLaunch);
    failReceiptStorage = true;
    return paid;
  },
  fulfill: async () => 1,
}), /앱을 닫지/);
const afterReceiptFailure = purchases;
failReceiptStorage = false;
await receiptFailure(request, { purchase, fulfill: async () => 1 });
assert.equal(purchases, afterReceiptFailure, 'A paid receipt in memory must survive a failed receipt write');
const cancelledPurchase = load();
await assert.rejects(cancelledPurchase(request, {
  purchase: async (beforeLaunch) => {
    await beforeLaunch?.();
    assert.ok(stored, 'Play is launched only after storing the request');
    throw { userCancelled: true };
  },
  fulfill: async () => 1,
}));
assert.equal(stored, null, 'Definitive cancellation allows a later fresh purchase');

// Exercise the actual paid creation callback with a mocked HTTP transport and session storage.
const authPath = 'apps/mobile/src/contexts/AuthContext.tsx';
const authSource = ts.createSourceFile(authPath, readFileSync(authPath, 'utf8'), ts.ScriptTarget.Latest, true);
const authProvider = authSource.statements.find((statement): statement is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(statement) && statement.name?.text === 'AuthProvider');
const createDeclaration = authProvider?.body?.statements.filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((declaration) => declaration.name.getText(authSource) === 'createInvitationPage');
assert.ok(createDeclaration?.initializer, 'Use the production AuthContext creation callback');
const createCallbackSource = ts.transpileModule(`(${createDeclaration.initializer.getText(authSource)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const billingApiSource = ts.transpileModule(readFileSync('apps/mobile/src/lib/apiBilling.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const paidScope = { appUserId: 'customer', apiBaseUrl: 'http://localhost:3000' };
const paidCreationRequest = {
  ...paidScope,
  productId: 'page_creation_premium',
  target: {
    action: 'createInvitationPage',
    input: {
      slugBase: 'pair',
      groomKoreanName: '신랑 입력 전',
      brideKoreanName: '신부 입력 전',
      groomEnglishName: '',
      brideEnglishName: '',
      servicePlan: 'premium',
      theme: 'simple',
    } satisfies MobileInvitationCreationInput,
  },
};
const createdPage: MobileInvitationCreationResponse = {
  page: {
    slug: 'already-paid-page',
    displayName: '웨딩 청첩장',
    published: false,
    productTier: 'premium',
    defaultTheme: 'simple',
    features: { maxGalleryImages: 10, shareMode: 'card', showMusic: true, showCountdown: true, showGuestbook: true },
    ticketCount: 0,
    displayPeriod: { enabled: true, startDate: '2026-11-09', endDate: '2027-05-09' },
  },
  session: { pageSlug: 'already-paid-page', token: 'fixture-editor-session', expiresAt: Date.now() + 60_000 },
  links: { publicUrl: '/already-paid-page', previewUrls: { default: '/preview/already-paid-page' } },
  permissions: {
    canViewDashboard: true, canEditInvitation: true, canManageGuestbook: true, canUploadImages: true,
    canManagePublication: true, canManageDisplayPeriod: true, canManageTickets: false, canIssueLinkToken: true,
  },
};
const responses = [
  Response.json(createdPage),
  Response.json({ ...createdPage, billingPurchaseConsumed: true }),
  Response.json({ ...createdPage, billingPurchaseConsumed: true }),
  Response.json({ code: 'BILLING_REVIEW_REQUIRED' }, { status: 409 }),
];
const billingApiExports: Record<string, unknown> = {};
runInNewContext(billingApiSource, {
  exports: billingApiExports,
  Error,
  require(id: string) {
    assert.equal(id, './apiCore');
    return {
      ...apiExports,
      fetchWithRetry: async (url: string, init: RequestInit) => {
        assert.equal(url, 'http://localhost:3000/api/mobile/billing/fulfill');
        assert.equal(init.method, 'POST');
        const payload = JSON.parse(String(init.body));
        assert.equal(payload.action, 'createInvitationPage');
        assert.equal(payload.createInput.slugBase, 'pair');
        assert.equal(payload.purchase.appUserId, 'customer');
        assert.equal(payload.purchase.productId, 'page_creation_premium');
        assert.equal(payload.purchase.transactionId, 'GPA.paid');
        assert.equal(payload.purchase.purchaseToken, 'google-token-paid');
        const response = responses.shift();
        assert.ok(response, 'Unexpected additional billing fulfillment request');
        return response;
      },
    };
  },
});
const appliedSessions: string[] = [];
let rejectEditorSession = false;
const createPaidInvitation = runInNewContext(createCallbackSource, {
  Error,
  apiBaseUrl: paidScope.apiBaseUrl,
  useCallback: (callback: unknown) => callback,
  fulfillMobileBillingPageCreation: billingApiExports.fulfillMobileBillingPageCreation,
  BillingReviewRequiredError: billingApiExports.BillingReviewRequiredError,
  customerAuthRevisionRef: { current: 0 },
  customerSessionRef: { current: { uid: paidScope.appUserId } },
  getCustomerIdToken: async () => 'fixture-customer-id',
  setIsAuthenticating: () => {},
  setAuthError: () => {},
  applyAuthenticatedSession: async (response: MobileInvitationCreationResponse) => {
    if (rejectEditorSession) return false;
    appliedSessions.push(response.session.pageSlug);
    return true;
  },
}) as (input: MobileInvitationCreationInput, options: { billingPurchase: TestReceipt }) => Promise<MobileInvitationCreationResponse>;
const createPurchase: TestPurchase = async (beforeLaunch) => ({
  ...(await purchase(beforeLaunch)),
  productIdentifier: paidCreationRequest.productId,
});
const fulfillPaidCreation = (receipt: TestReceipt) =>
  createPaidInvitation(paidCreationRequest.target.input, { billingPurchase: receipt });

// If storage cleanup fails after Play consumption, recovery must reuse the granted page.
const beforeConsumedCrash = consumed;
const beforePurchaseCrash = purchases;
failClearStorage = true;
await assert.rejects(load()(paidCreationRequest, {
  purchase: createPurchase,
  fulfill: fulfillPaidCreation,
}), /storage unavailable/);
assert.equal(consumed, beforeConsumedCrash + 1, 'The first Play consumption was successful');
assert.ok(stored?.includes('google-token-paid'), 'A crash before local cleanup leaves the original paid receipt');
failClearStorage = false;
rejectEditorSession = true;
await assert.rejects(loadModule().recoverPendingBillingPurchase(
  paidScope,
  (_request, receipt) => fulfillPaidCreation(receipt),
), /다시/);
assert.ok(stored?.includes('google-token-paid'), 'Recovery must keep the receipt when the editor session is not applied');
assert.equal(consumed, beforeConsumedCrash + 1);
rejectEditorSession = false;
const consumedReplay = await loadModule().recoverPendingBillingPurchase(
  paidScope,
  (_request, receipt) => fulfillPaidCreation(receipt),
);
assert.equal(consumedReplay.page.slug, 'already-paid-page');
assert.deepEqual(appliedSessions, ['already-paid-page', 'already-paid-page']);
assert.equal(consumed, beforeConsumedCrash + 1, 'A consumed purchase must never be consumed twice');
assert.equal(purchases, beforePurchaseCrash + 1, 'Recovery must never trigger another charge');
assert.equal(stored, null, 'Successful verified recovery clears the stale receipt');

await assert.rejects(load()(paidCreationRequest, { purchase: createPurchase, fulfill: fulfillPaidCreation }), {
  code: 'BILLING_REVIEW_REQUIRED',
  status: 409,
});
assert.equal(appliedSessions.length, 2, 'An unresolved grant must not apply an editor session');
assert.equal(consumed, beforeConsumedCrash + 1, 'An unresolved grant must not consume the purchase');
assert.ok(stored?.includes('google-token-paid'), 'A purchase requiring review must retain its receipt');
assert.equal(responses.length, 0);

console.log('billing preparation, purchase recovery and paid creation response checks passed (no payments)');
