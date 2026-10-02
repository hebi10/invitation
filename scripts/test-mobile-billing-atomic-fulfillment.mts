import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Data = Record<string, unknown>;
type Reference = {
  path: string;
  get(): Promise<{ id: string; exists: boolean; data(): Data | undefined }>;
  set(value: Data): Promise<void>;
};
type Transaction = {
  get(ref: Reference): ReturnType<Reference['get']>;
  set(ref: Reference, value: Data): void;
};
type BillingResult = { success: boolean; ticketCount: number };
const transactionId = 'GPA.atomic-ticket-test';
const billingPath = `billingFulfillments/${transactionId}`;
const purchase = { appUserId: 'customer-1', productId: 'ticket_pack_1', transactionId };

function loadModule(file: string, requireModule: (id: string) => unknown, globals: Data = {}) {
  const exports: Data = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, require: requireModule, Date, console, ...globals });
  return exports;
}

function mergeRecord(current: Data, patch: Data): Data {
  return {
    ...current,
    ...patch,
    ...(patch.stats ? { stats: { ...(current.stats as Data), ...(patch.stats as Data) } } : {}),
  };
}

function fixture() {
  const records = new Map<string, Data>(['page', 'other-page'].map((slug) => [
    `events/${slug}-id`,
    { eventId: `${slug}-id`, slug, ownerUid: 'customer-1', eventType: 'wedding',
      stats: { ticketBalance: 2, ticketCount: 2, commentCount: 7 }, version: 4 },
  ]));
  let authorized = true;
  let canManageTickets = true;
  let failure: 'none' | 'before-commit' | 'after-commit' = 'none';
  let beforeTransaction: (() => void) | null = null;
  let queue = Promise.resolve();
  const commit = (writes: Array<[string, Data]>) => {
    const completesPurchase = writes.some(([path, value]) => path === billingPath && value.status === 'fulfilled');
    const injectedFailure = completesPurchase ? failure : 'none';
    if (completesPurchase) failure = 'none';
    if (injectedFailure === 'before-commit') throw new Error('injected commit failure');
    for (const [path, value] of writes) records.set(path, mergeRecord(records.get(path) ?? {}, value));
    if (injectedFailure === 'after-commit') throw new Error('injected response loss');
  };
  const reference = (path: string): Reference => ({
    path,
    async get() {
      const data = records.get(path);
      return { id: path.split('/').at(-1)!, exists: Boolean(data), data: () => data && structuredClone(data) };
    },
    async set(value) { commit([[path, value]]); },
  });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => reference(`${name}/${id}`) }),
    runTransaction<T>(callback: (transaction: Transaction) => Promise<T>) {
      const run = queue.then(async () => {
        beforeTransaction?.();
        beforeTransaction = null;
        const writes: Array<[string, Data]> = [];
        const result = await callback({
          get: (ref) => ref.get(),
          set: (ref, value) => { writes.push([ref.path, value]); },
        });
        commit(writes);
        return result;
      });
      queue = run.then(() => {}, () => {});
      return run;
    },
  };
  const normalizeSummary = (id: string, data: Data) => ({ ...data, eventId: id, ...(data.stats as Data) });
  const eventRepository = {
    EVENTS_COLLECTION: 'events',
    resolveStoredEventBySlug: async (slug: string) => {
      const data = records.get(`events/${slug}-id`);
      return data ? { summary: normalizeSummary(`${slug}-id`, structuredClone(data)) } : null;
    },
  };
  const repositoryRequire = (id: string): unknown => {
    if (id === '../firebaseAdmin') return { getServerFirestore: () => db };
    if (id === './eventRepository') return eventRepository;
    if (id === './eventReadThroughDtos') return { normalizeEventSummaryRecord: normalizeSummary };
    if (id === '../eventDeletionPolicy') return { isEventDeletionBlockingAccess: (value: Data | null) => ['pending', 'running', 'failed'].includes(String(value?.status)) };
    return {};
  };
  const repository = loadModule('src/server/repositories/billingFulfillmentRepository.ts', repositoryRequire);
  const tickets = loadModule('src/server/repositories/eventTicketRepository.ts', repositoryRequire)
    .firestoreEventTicketRepository as {
      adjustTicketCountByPageSlug: (slug: string, amount: number) => Promise<number>;
      getTicketCountByPageSlug: (slug: string) => Promise<number>;
    };
  const service = loadModule('src/server/mobileBillingServerService.ts', (id) => {
    if (id === './repositories/billingFulfillmentRepository') return repository;
    if (id === './repositories/eventRepository') return eventRepository;
    if (id === '@/lib/mobileBillingProducts') return { getMobileBillingProductDefinition: () => ({ kind: 'ticketPack', ticketCount: 1 }) };
    if (id === './clientEditorMobileApi') return {
      authorizeMobileClientEditorToken: async (slug: string) => authorized ? {
        permissions: { canManageTickets }, session: { ownerUid: 'customer-1', eventId: `${slug}-id` },
      } : null,
      hasMobileClientEditorPermission: (permissions: Data, permission: string) => permissions[permission] === true,
      buildMissingMobileClientEditorPermissionError: () => 'permission denied',
    };
    if (id === './pageTicketServerService') return {
      adjustServerPageTicketCount: tickets.adjustTicketCountByPageSlug,
      getServerPageTicketCount: tickets.getTicketCountByPageSlug,
    };
    if (id === './customerWalletServerService') return { recordMobileTicketPackAssignedToEvent: async () => {} };
    return {};
  }, {
    process: { env: { REVENUECAT_SERVER_API_KEY: 'local-test-key' } },
    fetch: async () => ({ ok: true, json: async () => ({ subscriber: { non_subscriptions: {
      ticket_pack_1: [{ id: 'revenuecat-alias', store_transaction_id: transactionId, store: 'play_store' }],
    } } }) }),
  });
  const fulfill = service.fulfillServerMobileTicketPackPurchase as (
    receipt: typeof purchase, slug: string, token: string
  ) => Promise<BillingResult>;
  return {
    run: (slug = 'page', receipt = purchase) => fulfill(receipt, slug, 'local-test-session'),
    records,
    balance: (slug = 'page') => (records.get(`events/${slug}-id`)!.stats as Data).ticketBalance,
    auth: (value: boolean) => { authorized = value; },
    permission: (value: boolean) => { canManageTickets = value; },
    fail: (value: typeof failure) => { failure = value; },
    beforeTransaction: (callback: () => void) => { beforeTransaction = callback; },
  };
}

const checks: Array<[string, () => Promise<void>]> = [
  ['Expired session leaves the paid transaction available for an authorized retry', async () => {
    const state = fixture();
    state.auth(false);
    await assert.rejects(state.run(), /authorization/);
    assert.equal(state.records.has(billingPath), false, 'Rejected session must not create a processing lock');
    state.auth(true);
    assert.equal((await state.run()).ticketCount, 3);
  }],
  ['Commit failure rolls back both tickets and fulfillment, then retry grants once', async () => {
    const state = fixture();
    state.fail('before-commit');
    await assert.rejects(state.run(), /commit failure/);
    assert.equal(state.balance(), 2, 'Failed fulfillment commit must not grant tickets');
    assert.equal(state.records.has(billingPath), false);
    assert.equal((await state.run()).ticketCount, 3);
    assert.equal(state.records.get(billingPath)?.status, 'fulfilled');
  }],
  ['Lost response after commit does not reset fulfillment or grant twice', async () => {
    const state = fixture();
    state.fail('after-commit');
    await assert.rejects(state.run(), /response loss/);
    assert.equal(state.records.get(billingPath)?.status, 'fulfilled');
    assert.equal((await state.run()).ticketCount, 3);
    assert.equal(state.balance(), 3);
  }],
  ['Concurrent receipt and alias replays grant the product only once', async () => {
    const state = fixture();
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      state.run('page', index % 2 ? { ...purchase, transactionId: 'revenuecat-alias' } : purchase)));
    assert.ok(results.every((result) => result.success && result.ticketCount === 3));
    assert.equal(state.balance(), 3);
    assert.equal((state.records.get('events/page-id')!.stats as Data).commentCount, 7);
    assert.equal(state.records.get('events/page-id')!.version, 5);
  }],
  ['Fulfilled replay still requires a valid session and ticket permission', async () => {
    const state = fixture();
    await state.run();
    state.auth(false);
    await assert.rejects(state.run(), /authorization/);
    state.auth(true);
    state.permission(false);
    await assert.rejects(state.run(), /permission/);
    assert.equal(state.balance(), 3);
  }],
  ['One transaction cannot fulfill or acknowledge a different target or purchaser', async () => {
    const state = fixture();
    await state.run();
    await assert.rejects(state.run('other-page'), /target|linked|another/);
    await assert.rejects(state.run('page', { ...purchase, appUserId: 'customer-2' }), /linked|another/);
    assert.equal(state.balance('other-page'), 2);
    assert.equal(state.balance(), 3);
  }],
  ['Legacy partial processing and failed records require review instead of regranting', async () => {
    for (const status of ['processing', 'failed']) {
      const state = fixture();
      state.records.set(billingPath, { ...purchase, kind: 'ticketPack', status });
      const original = structuredClone(state.records.get(billingPath));
      await assert.rejects(state.run(), /manual|review/i);
      assert.equal(state.balance(), 2);
      assert.deepEqual(state.records.get(billingPath), original);
    }
  }],
  ['Event deletion or ownership change at commit cannot receive a purchased ticket', async () => {
    for (const patch of [{ deletion: { status: 'running' } }, { ownerUid: 'another-owner' }]) {
      const state = fixture();
      state.beforeTransaction(() => {
        state.records.set('events/page-id', { ...state.records.get('events/page-id'), ...patch });
      });
      await assert.rejects(state.run(), /available|authorization|owner/i);
      assert.equal(state.balance(), 2);
      assert.equal(state.records.has(billingPath), false);
    }
  }],
];

function reviewFixture() {
  const state = fixture();
  state.records.set(billingPath, { ...purchase, kind: 'ticketPack', status: 'failed' });
  const route = loadModule('src/app/api/mobile/billing/fulfill/route.ts', (id) => {
    if (id === 'next/server') return { NextResponse: { json: Response.json } };
    if (id === '@/lib/mobileBillingProducts') return { isMobileBillingProductId: () => true };
    if (id === '@/lib/invitationPageSlug') return {
      validateInvitationPageSlugBase: (slug: string) => ({ isValid: true, normalizedSlugBase: slug }),
    };
    if (id === '@/server/apiErrorResponse') return { GENERIC_SERVER_ERROR_MESSAGE: '서버 오류가 발생했습니다.' };
    if (id === '@/server/customerAuthVerification') return { canCreateCustomerOwnedInvitation: () => true };
    if (id === '@/server/customerApiAuth') return { verifyCustomerRequest: async () => ({ uid: 'customer-1' }) };
    if (id === '@/server/mobileBillingServerService') return {
      fulfillServerMobileTicketPackPurchase: () => state.run(),
      fulfillServerMobilePageCreationPurchase: async () => ({ page: { slug: 'created-page' } }),
    };
    if (id === '@/server/clientEditorMobileApi') return { readMobileClientEditorDeviceId: () => 'local-test-device' };
    if (id === '@/server/requestRateLimit') return {
      applyScopedRateLimit: async () => ({ allowed: true }), buildRateLimitHeaders: () => ({}),
    };
    return {};
  }, { URL, console: { error() {} } }) as { POST(request: Request): Promise<Response> };
  const errors = loadModule('apps/mobile/src/lib/apiErrors.ts', () => ({}), { Error });
  const apiCore = loadModule('apps/mobile/src/lib/apiCore.ts', (id) => {
    if (id === './apiErrors') return errors;
    if (id === 'expo-constants') return { default: { expoConfig: {} } };
    if (id === './storage') return { getOrCreateMobileDeviceId: async () => 'local-test-device' };
    return {};
  }, {
    URL, Headers, Error, process: { env: {} },
    fetch: (url: string, init: RequestInit) => route.POST(new Request(url, init)),
  });
  const api = loadModule('apps/mobile/src/lib/apiBilling.ts', (id) => id === './apiCore' ? apiCore : {}, { Error }) as {
    fulfillMobileBillingTicketPack(baseUrl: string, payload: Data): Promise<BillingResult>;
    fulfillMobileBillingPageCreation(baseUrl: string, payload: Data): Promise<{ page: { slug: string } }>;
  };
  let stored: string | null = null;
  let purchases = 0;
  const loadPending = () => loadModule('apps/mobile/src/lib/pendingBillingPurchase.ts', (id) => {
    if (id === './storage') return {
      getStoredString: async () => stored,
      setStoredString: async (_key: string, value: string | null) => { stored = value; },
    };
    if (id === './billing') return {
      getBillingTransactionHistory: async () => ({ transactions: [], requestDate: '2026-10-02T00:00:00Z' }),
      isDefinitelyUnchargedBillingError: () => false,
    };
    return {};
  }, { Error }) as {
    runPendingBillingPurchase(request: Data, options: Data): Promise<unknown>;
  };
  const ticketPayload = { purchase, targetPageSlug: 'page', targetToken: 'local-test-session' };
  const runPending = (pending = loadPending()) => pending.runPendingBillingPurchase({
    appUserId: purchase.appUserId, productId: purchase.productId, apiBaseUrl: 'https://example.test',
    target: { action: 'grantTicketPack', pageSlug: 'page' },
  }, {
    purchase: async () => {
      purchases++;
      return { appUserId: purchase.appUserId, productIdentifier: purchase.productId, transactionIdentifier: transactionId };
    },
    fulfill: () => api.fulfillMobileBillingTicketPack('https://example.test', ticketPayload),
  });
  return {
    api,
    post: () => route.POST(new Request('https://example.test/api/mobile/billing/fulfill', {
      method: 'POST', body: JSON.stringify({ action: 'grantTicketPack', ...ticketPayload }),
    })),
    fulfill: () => api.fulfillMobileBillingTicketPack('https://example.test', ticketPayload),
    runPending,
    stored: () => stored,
    purchases: () => purchases,
  };
}

checks.push(
  ['Legacy billing review is a safe actionable API conflict', async () => {
    const state = reviewFixture();
    const response = await state.post();
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.code, 'BILLING_REVIEW_REQUIRED');
    assert.match(body.error, /문의/);
    assert.doesNotMatch(body.error, /다시 시도|manual fulfillment|GPA\./);
  }],
  ['Billing API preserves the review code and customer-facing guidance', async () => {
    const state = reviewFixture();
    await assert.rejects(state.fulfill(), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error & { code: string }).code, 'BILLING_REVIEW_REQUIRED');
      assert.match(error.message, /문의/);
      assert.doesNotMatch(error.message, /다시 시도/);
      return true;
    });
  }],
  ['Pending purchase retains receipt and review guidance across app restart', async () => {
    const state = reviewFixture();
    for (let attempt = 0; attempt < 2; attempt++) {
      await assert.rejects(state.runPending(), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as Error & { code: string }).code, 'BILLING_REVIEW_REQUIRED');
        assert.match(error.message, /문의/);
        assert.doesNotMatch(error.message, /같은 정보로 다시 시도/);
        return true;
      });
      assert.ok(state.stored()?.includes(transactionId));
    }
    assert.equal(state.purchases(), 1, 'Review must retain the receipt instead of enabling another charge');
  }],
  ['Page creation success keeps its original API behavior', async () => {
    const state = reviewFixture();
    const result = await state.api.fulfillMobileBillingPageCreation('https://example.test', {
      purchase, customerIdToken: 'local-customer-token',
      input: { slugBase: 'created-page', groomKoreanName: '신랑', brideKoreanName: '신부', theme: 'simple' },
    });
    assert.equal(result.page.slug, 'created-page');
  }],
);

for (const [name, check] of checks) {
  try {
    await check();
    console.log(`PASS ${name}`);
  } catch (error) {
    process.exitCode = 1;
    console.error(`FAIL ${name}`, error instanceof Error ? error.message : error);
  }
}
if (!process.exitCode) console.log('atomic billing fulfillment checks passed (actual service/repositories, local fake Firestore and RevenueCat only)');
