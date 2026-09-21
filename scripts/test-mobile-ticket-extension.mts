import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type MockRecord = {
  stats?: Record<string, number>;
  visibility?: Record<string, Date | boolean>;
  displayPeriod?: { isActive: boolean; startDate: Date; endDate: Date };
  [key: string]: unknown;
};
type ExtensionResult = { ticketCount: number; enabled: boolean; startDate: Date; endDate: Date };
type MockTransaction = {
  get: (ref: { path: string }) => Promise<{ id: string | undefined; exists: boolean; data: () => MockRecord | undefined }>;
  set: (ref: { path: string }, data: MockRecord) => unknown;
};

const source = ts.transpileModule(readFileSync('src/server/repositories/eventTicketRepository.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture(tickets = 2) {
  const records = new Map<string, MockRecord>();
  records.set('events/event-1', {
    eventId: 'event-1', slug: 'page', eventType: 'wedding', version: 3,
    stats: { ticketBalance: tickets, ticketCount: tickets, commentCount: 7 },
    visibility: { published: false, displayStartAt: new Date('2026-01-01T00:00:00Z'), displayEndAt: new Date('2026-01-31T00:00:00Z') },
    displayPeriod: { isActive: true, startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-01-31T00:00:00Z') },
  });
  let failCommit = false;
  let queue = Promise.resolve();
  const db = {
    collection: (collection: string) => ({ doc: (id: string) => ({ path: `${collection}/${id}` }) }),
    runTransaction: (callback: (tx: MockTransaction) => Promise<ExtensionResult>) => {
      const run = queue.then(async () => {
        const writes: Array<[string, MockRecord]> = [];
        const result = await callback({
          get: async (ref: { path: string }) => ({ id: ref.path.split('/').at(-1), exists: records.has(ref.path), data: () => records.get(ref.path) }),
          set: (ref: { path: string }, value: MockRecord) => writes.push([ref.path, value]),
        });
        if (failCommit) throw new Error('commit interrupted');
        for (const [path, data] of writes) {
          const current = records.get(path) ?? {};
          records.set(path, { ...current, ...data, stats: { ...current.stats, ...data.stats }, visibility: { ...current.visibility, ...data.visibility } });
        }
        return result;
      });
      queue = run.then(() => {}, () => {});
      return run;
    },
  };
  const exports = {} as { firestoreEventTicketRepository: { redeemDisplayPeriodTicketByPageSlug: (page: string, requestId: string) => Promise<ExtensionResult> } };
  runInNewContext(source, { exports, Date, require(id: string) {
    if (id === '../firebaseAdmin') return { getServerFirestore: () => db };
    if (id === './eventRepository') return {
      EVENTS_COLLECTION: 'events',
      resolveStoredEventBySlug: async () => ({ summary: { eventId: 'event-1' } }),
    };
    if (id === './eventReadThroughDtos') return { normalizeEventSummaryRecord: (_id: string, data: MockRecord) => ({ ...data, ...data.stats }) };
    return {};
  } });
  return {
    redeem: (requestId: string) => exports.firestoreEventTicketRepository.redeemDisplayPeriodTicketByPageSlug('page', requestId),
    page: () => records.get('events/event-1') as Required<MockRecord>,
    fail: (value: boolean) => { failCommit = value; },
  };
}

const first = fixture();
const [a, b] = await Promise.all([first.redeem('extension-request-0001'), first.redeem('extension-request-0001')]);
assert.equal(a.ticketCount, 1);
assert.equal(b.ticketCount, 1, 'An ambiguous-response retry must not consume another ticket');
assert.equal(first.page().stats.ticketBalance, 1);
assert.equal(first.page().stats.commentCount, 7);
assert.equal(first.page().visibility.published, false);
assert.equal(a.endDate.toISOString(), '2026-02-28T00:00:00.000Z', 'Month-end must clamp to the target month');
assert.equal((first.page().visibility.displayEndAt as Date).toISOString(), a.endDate.toISOString());
await first.redeem('extension-request-0002');
assert.equal(first.page().stats.ticketBalance, 0);
await assert.rejects(first.redeem('extension-request-0003'), /티켓|tickets/i);
assert.equal(first.page().displayPeriod.endDate.toISOString(), '2026-03-28T00:00:00.000Z');
const broken = fixture();
broken.fail(true);
await assert.rejects(broken.redeem('extension-request-0004'), /interrupted/);
assert.equal(broken.page().stats.ticketBalance, 2, 'A failed commit must not deduct tickets');
assert.equal(broken.page().displayPeriod.endDate.toISOString(), '2026-01-31T00:00:00.000Z');
broken.fail(false);
assert.equal((await broken.redeem('extension-request-0004')).ticketCount, 1);
await assert.rejects(broken.redeem('../invalid'), /request|요청/i);
console.log('atomic mobile ticket extension and retry checks passed (mock Firestore only)');

const pendingSource = ts.transpileModule(readFileSync('apps/mobile/src/lib/pendingTicketExtension.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let stored: unknown[] = [];
let suffix = 0;
function loadPendingModule() {
  const exports = {} as {
    getOrCreateTicketExtensionRequest: (scope: string) => Promise<string>;
    completeTicketExtensionRequest: (scope: string, requestId: string) => Promise<void>;
  };
  runInNewContext(pendingSource, { exports, Date, require(id: string) {
    if (id === './id') return { createRandomSuffix: () => String(++suffix).padStart(24, '0') };
    return {
      getStoredJson: async (_key: string, _fallback: unknown, options: { sensitive: boolean }) => {
        assert.equal(options.sensitive, true);
        return structuredClone(stored);
      },
      setStoredJson: async (_key: string, value: unknown[], options: { sensitive: boolean }) => {
        assert.equal(options.sensitive, true);
        stored = structuredClone(value);
      },
    };
  } });
  return exports;
}
const pending = loadPendingModule();
const requestId = await pending.getOrCreateTicketExtensionRequest('server/page/account-1');
const restarted = loadPendingModule();
assert.equal(await restarted.getOrCreateTicketExtensionRequest('server/page/account-1'), requestId, 'App restart must reuse a pending request');
assert.notEqual(await restarted.getOrCreateTicketExtensionRequest('server/page/account-2'), requestId, 'Different accounts must not share pending requests');
assert.notEqual(await restarted.getOrCreateTicketExtensionRequest('server/other-page/account-1'), requestId);
await restarted.completeTicketExtensionRequest('server/page/account-1', 'different-request');
assert.equal(await restarted.getOrCreateTicketExtensionRequest('server/page/account-1'), requestId);
await restarted.completeTicketExtensionRequest('server/page/account-1', requestId);
assert.notEqual(await restarted.getOrCreateTicketExtensionRequest('server/page/account-1'), requestId, 'Only an acknowledged request can start a new extension');
console.log('durable ticket extension request identity checks passed (mock storage only)');

const transpile = (path: string) => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const contractExports: Record<string, unknown> = {};
runInNewContext(transpile('src/contracts/mobileClientEditorPageActions.ts'), { exports: contractExports });
type RouteResponse = { status: number; payload: Record<string, unknown>; headers: { set: () => void } };
const json = (payload: Record<string, unknown>, options?: { status?: number }): RouteResponse => ({ status: options?.status ?? 200, payload, headers: { set() {} } });
let authenticated = true;
let recentAuth = true;
let allowTickets = true;
let allowPeriod = true;
let redeemed = 0;
const routeExports = {} as { POST: (request: { json: () => Promise<object> }, context: { params: Promise<{ slug: string }> }) => Promise<RouteResponse> };
runInNewContext(transpile('src/app/api/mobile/client-editor/pages/[slug]/route.ts'), {
  exports: routeExports, Date, Error, console,
  require(id: string) {
    if (id === 'next/server') return { NextResponse: { json } };
    if (id === '@/contracts/mobileClientEditorPageActions') return contractExports;
    if (id === '@/lib/invitationThemes') return { isInvitationThemeKey: () => false };
    if (id === '@/server/clientEditorMobileApi') return {
      authorizeMobileClientEditorRequest: async () => authenticated ? { permissions: { canManageTickets: allowTickets, canManageDisplayPeriod: allowPeriod }, session: { pageSlug: 'page' } } : null,
      hasMobileClientEditorPermission: (permissions: Record<string, boolean>, permission: string) => permissions[permission],
      buildMissingMobileClientEditorPermissionError: () => 'permission denied',
      MobileClientEditorAccessError: class extends Error {},
    };
    if (id === '@/server/requestRateLimit') return { applyScopedRateLimit: async () => ({ allowed: true }), buildRateLimitHeaders: () => ({}) };
    if (id === '@/server/mobileClientEditorHighRisk') return {
      authorizeMobileClientEditorHighRiskToken: () => recentAuth,
      readMobileClientEditorHighRiskToken: () => 'test-token',
      writeMobileClientEditorAuditLog: async () => {},
    };
    if (id === '@/server/pageTicketServerService') return { redeemServerDisplayPeriodTicket: async () => {
      redeemed += 1;
      return { enabled: true, ticketCount: 1, startDate: new Date('2026-01-01Z'), endDate: new Date('2026-02-28Z') };
    } };
    return {};
  },
});
const post = (action = 'redeemDisplayPeriodTicket', requestId = 'extension-request-0001') => routeExports.POST({ json: async () => ({ action, requestId, amount: 100, enabled: true, endDate: '2099-01-01' }) }, { params: Promise.resolve({ slug: 'page' }) });
authenticated = false;
assert.equal((await post()).status, 401);
authenticated = true;
allowTickets = false;
assert.equal((await post()).status, 403);
allowTickets = true;
allowPeriod = false;
assert.equal((await post()).status, 403);
allowPeriod = true;
recentAuth = false;
assert.equal((await post()).status, 403);
recentAuth = true;
assert.equal((await post('redeemDisplayPeriodTicket', '../bad')).status, 400);
for (const action of ['adjustTicketCount', 'setDisplayPeriod', 'extendDisplayPeriod']) {
  assert.equal((await post(action)).status, 409, `${action} must not allow ticket or period grants`);
}
assert.equal(redeemed, 0, 'Rejected requests must not reach the transaction');
const success = await post();
assert.equal(success.status, 200);
assert.equal(success.payload.enabled, true);
assert.equal(success.payload.ticketCount, 1);
assert.equal(redeemed, 1);
console.log('authenticated ticket redemption and legacy bypass rejection checks passed (mock route only)');
