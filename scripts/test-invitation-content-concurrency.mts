import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Run the real repository, mappers, validation and service; replace only Firebase IO.
// Removing the atomic version check must allow two stale snapshots to win this test.
type Data = Record<string, unknown>;
type Snapshot = { id: string; exists: boolean; data(): Data | undefined };
type Reference = { path: string; id: string; collection(name: string): { doc(id: string): Reference; get(): Promise<{ docs: Snapshot[] }> }; get(): Promise<Snapshot>; set(data: Data): Promise<Map<string, Data>>; update(data: Data): Promise<Map<string, Data>> };
type Transaction = { get(reference: Reference): Promise<Snapshot>; set(reference: Reference, data: Data): void };
type ClientTransaction = { get(reference: Reference): Promise<Omit<Snapshot, 'exists'> & { exists(): boolean }>; set: Transaction['set'] };
const records = new Map<string, Data>();
const nativeRequire = createRequire(import.meta.url);
const modules = new Map<string, { exports: unknown }>();
let pending = Promise.resolve();
let afterSummaryRead: (() => void) | null = null;
let afterEditableRead: (() => void) | null = null;
let unfilteredEventReads = 0;
let sendRequest: typeof fetch = async () => { throw new Error('Unexpected network request.'); };
function ref(documentPath: string): Reference {
  return {
    path: documentPath,
    id: documentPath.split('/').at(-1)!,
    collection: (name: string) => collection(`${documentPath}/${name}`),
    get: async () => {
      const value = snapshot(documentPath);
      if (documentPath === 'events/evt_concurrency-test' && afterSummaryRead) {
        const interleave = afterSummaryRead;
        afterSummaryRead = null;
        interleave();
      }
      return value;
    },
    set: async (data: Data) => records.set(documentPath, { ...records.get(documentPath), ...structuredClone(data) }),
    update: async (data: Data) => records.set(documentPath, { ...records.get(documentPath), ...structuredClone(data) }),
  };
}
function snapshot(documentPath: string) {
  const value = structuredClone(records.get(documentPath));
  return { id: documentPath.split('/').at(-1)!, exists: Boolean(value), data: () => value };
}
function collection(name: string, condition?: { field: string; value: unknown }) {
  return {
    doc: (id: string) => ref(`${name}/${id}`),
    where: (field: string, operator: string, value: unknown) => {
      assert.equal(operator, '==');
      return collection(name, { field, value });
    },
    get: async () => {
      if (name === 'events' && !condition) unfilteredEventReads += 1;
      return { docs: [...records.keys()]
        .filter((key) => key.startsWith(`${name}/`) && key.split('/').length === name.split('/').length + 1)
        .filter((key) => !condition || records.get(key)?.[condition.field] === condition.value)
        .map(snapshot) };
    },
  };
}
const db = {
  collection,
  runTransaction(callback: (transaction: Transaction) => Promise<unknown>) {
    const result = pending.then(async () => {
      const writes: Array<[string, Data]> = [];
      const result = await callback({
        get: (reference: Reference) => Promise.resolve(snapshot(reference.path)),
        set: (reference: Reference, data: Data) => { writes.push([reference.path, structuredClone(data)]); },
      });
      if (!writes.length && afterEditableRead) {
        const interleave = afterEditableRead;
        afterEditableRead = null;
        interleave();
      }
      for (const [documentPath, data] of writes) records.set(documentPath, { ...records.get(documentPath), ...data });
      return result;
    });
    pending = result.then(() => undefined, () => undefined);
    return result;
  },
};
const clientFirestore = {
  doc: (_db: unknown, ...parts: string[]) => ref(parts.join('/')),
  getDoc: async (reference: Reference) => { const value = await reference.get(); return { ...value, exists: () => value.exists }; },
  setDoc: async (reference: Reference, data: Data) => reference.set(data),
  runTransaction: (_db: unknown, callback: (transaction: ClientTransaction) => Promise<unknown>) => db.runTransaction((transaction) => callback({
    get: async (reference: Reference) => { const value = await transaction.get(reference); return { ...value, exists: () => value.exists }; },
    set: transaction.set,
  })),
};
function load(file: string): unknown {
  let absolute = path.resolve(file);
  if (!existsSync(absolute)) absolute += '.ts';
  if (modules.has(absolute)) return modules.get(absolute)!.exports;
  const loaded = { exports: {} };
  modules.set(absolute, loaded);
  const code = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    module: loaded, exports: loaded.exports, Date, Error, console,
    process: { ...process, env: { ...process.env, NEXT_PUBLIC_USE_FIREBASE: 'true' } },
    structuredClone, Buffer, URL, fetch: (...args: Parameters<typeof fetch>) => sendRequest(...args),
    require(id: string) {
      if (id === 'server-only') return {};
      if (id.endsWith('/firebaseAdmin')) return { getServerFirestore: () => db, getServerAuth: () => ({ verifyIdToken: async () => ({ uid: 'owner', email_verified: true }) }) };
      if (id === '@/lib/firebase') return { USE_FIREBASE: true, ensureFirebaseInit: async () => ({ db, auth: { currentUser: { uid: 'owner', getIdToken: async () => 'test-token' } } }) };
      if (id === 'firebase/firestore') return clientFirestore;
      if (id === 'react') return { useCallback: (callback: unknown) => callback, useRef: (value: unknown) => ({ current: value }) };
      if (id.startsWith('@/')) return load(path.resolve('src', id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id));
      return nativeRequire(id);
    },
  });
  return loaded.exports;
}

const { getAllWeddingPageSeeds } = load('src/config/weddingPages.ts') as typeof import('../src/config/weddingPages');
const config = { ...getAllWeddingPageSeeds()[0], slug: 'concurrency-test' };
const eventPath = 'events/evt_concurrency-test';
const contentPath = `${eventPath}/content/current`;
const now = new Date('2026-10-01T00:00:00Z');
records.set('eventSlugIndex/concurrency-test', { slug: config.slug, eventId: 'evt_concurrency-test', status: 'active' });
records.set(eventPath, {
  eventId: 'evt_concurrency-test', slug: config.slug, eventType: 'wedding', published: false,
  defaultTheme: 'simple', ownerUid: 'owner', stats: { ticketBalance: 5, commentCount: 3 },
  hasCustomContent: true, hasCustomConfig: true, createdAt: now, updatedAt: now, version: 10,
});
records.set(contentPath, { content: config, createdAt: now, updatedAt: now });
const service = load('src/server/invitationPageServerService.ts') as typeof import('../src/server/invitationPageServerService');
const repository = (load('src/server/repositories/eventRepository.ts') as typeof import('../src/server/repositories/eventRepository')).firestoreEventRepository;

// Legacy content begins at 0, independently of summary version/ticket updates.
const initial = await service.getServerEditableInvitationPageConfig(config.slug);
const saves = await Promise.allSettled([
  service.saveServerInvitationPageConfig({ ...initial.config, displayName: 'First edit' }, { expectedVersion: 0, published: true, defaultTheme: 'classic-r' }),
  service.saveServerInvitationPageConfig({ ...initial.config, displayName: 'Stale edit' }, { expectedVersion: 0, published: false, defaultTheme: 'simple' }),
]);
assert.equal(saves.filter((entry) => entry.status === 'fulfilled').length, 1, 'Only one save from the same version may commit.');
assert.equal(initial.version, 0, 'Editable reads must return the version of the same content snapshot.');
const conflict = saves.find((entry) => entry.status === 'rejected') as PromiseRejectedResult;
assert.equal(conflict.reason.status, 409);
assert.equal(conflict.reason.code, 'VERSION_CONFLICT');
assert.equal(conflict.reason.currentVersion, 1);
assert.equal(records.get(contentPath)?.version, 1);
assert.equal((records.get(contentPath)?.content as Data)?.displayName, 'First edit');
assert.equal(records.get(eventPath)?.published, true, 'Rejected snapshot must not change publication metadata.');
assert.equal(records.get(eventPath)?.defaultTheme, 'classic-r');
assert.equal((records.get(eventPath)?.stats as Data)?.ticketBalance, 5);
assert.equal(records.get(eventPath)?.ownerUid, 'owner');
const saved = await service.getServerEditableInvitationPageConfig(config.slug);
assert.equal(saved.version, 1);
assert.equal(saved.config.displayName, 'First edit');

for (const expectedVersion of [undefined, null, -1, 1.5, '1']) {
  const before = structuredClone([...records]);
  await assert.rejects(repository.saveContentBySlug({ slug: config.slug, config, expectedVersion }), (error: { status?: number }) => error.status === (expectedVersion == null ? 428 : 400));
  assert.deepEqual([...records], before, 'Invalid or unversioned saves cannot write any document.');
}
await repository.saveContentBySlug({ slug: config.slug, config: { ...config, displayName: 'Next edit' }, expectedVersion: 1 });
assert.equal((await repository.findContentBySlug(config.slug)).version, 2);
const clientRepository = load('src/services/repositories/clientEventRepositoryCore.ts') as typeof import('../src/services/repositories/clientEventRepositoryCore');
const adminSaves = await Promise.allSettled([
  clientRepository.saveClientEventContentBySlug({ slug: config.slug, config: { ...config, displayName: 'Admin first' }, expectedVersion: 2, published: false, defaultTheme: 'simple' }),
  clientRepository.saveClientEventContentBySlug({ slug: config.slug, config: { ...config, displayName: 'Admin stale' }, expectedVersion: 2, published: true, defaultTheme: 'classic-r' }),
]);
assert.equal(adminSaves.filter((entry) => entry.status === 'fulfilled').length, 1, 'Admin direct Firestore saves must enforce the same version check.');
assert.equal((records.get(contentPath)?.content as Data)?.displayName, 'Admin first');
assert.equal(records.get(contentPath)?.version, 3);
assert.equal(records.get(eventPath)?.published, false);
assert.equal(records.get(eventPath)?.defaultTheme, 'simple');
assert.equal((records.get(eventPath)?.stats as Data)?.ticketBalance, 5);
assert.equal(records.get(eventPath)?.ownerUid, 'owner');
const route = load('src/app/api/customer/events/[slug]/editable/route.ts') as typeof import('../src/app/api/customer/events/[slug]/editable/route');
const params = { params: Promise.resolve({ slug: config.slug }) };
sendRequest = async (_url, options) => {
  const request = new Request('https://example.test/api/customer/events/concurrency-test/editable', options);
  return options?.method === 'POST' ? route.POST(request, params) : route.GET(request, params);
};
const gateway = (load('src/app/page-wizard/wizardPersistenceGateway.ts') as typeof import('../src/app/page-wizard/wizardPersistenceGateway')).productionWizardPersistenceGateway;
const editable = await gateway.loadEditable(config.slug, false);
assert.equal(editable.version, 3);
assert.equal(editable.config.displayName, 'Admin first');
const customerSave = await gateway.save({ slug: config.slug, config: { ...editable.config, displayName: 'Customer first' }, expectedVersion: editable.version, published: true, defaultTheme: 'classic-r', isAdmin: false });
assert.equal(customerSave.version, 4);
assert.equal(customerSave.config.displayName, 'Customer first');
assert.equal(customerSave.published, false, 'Customer save must retain existing publication authority.');
assert.equal(customerSave.defaultTheme, 'simple');
await assert.rejects(gateway.save({ slug: config.slug, config: editable.config, expectedVersion: editable.version, published: true, defaultTheme: 'simple', isAdmin: false }), (error: { status?: number; code?: string }) => error.status === 409 && error.code === 'VERSION_CONFLICT');
for (const [expectedVersion, expectedStatus] of [[undefined, 428], [null, 428], [-1, 400], ['4', 400]] as const) {
  const response = await route.POST(new Request('https://example.test/', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ config, expectedVersion }) }), params);
  assert.equal(response.status, expectedStatus);
  assert.equal(records.get(contentPath)?.version, 4);
}

// The real save hook must keep the local draft/version on conflict and must not call onPersisted.
const hook = load('src/app/page-wizard/hooks/useWizardPersistence.ts') as typeof import('../src/app/page-wizard/hooks/useWizardPersistence');
let replacedDraft = false;
let replacedVersion = false;
let markedSaved = false;
let conflictShown = false;
let released = false;
const persistence = hook.useWizardPersistence({
  formState: editable.config, previewFormState: editable.config, eventType: 'wedding',
  defaultTheme: 'simple', published: false, resolvedPersistedSlug: config.slug, slugInput: config.slug,
  defaultSeedSlug: null, isAdminLoggedIn: false, gateway, persistedVersion: 3,
  setPersistedSlug() {}, setSlugInput() {}, setPublished() {}, setLastSavedAt() {}, setIsSaving() {},
  setFormState() { replacedDraft = true; }, setPersistedVersion() { replacedVersion = true; },
  normalizeFormState: (value) => value, showNotice() {}, showErrorNotice() {},
  onVersionConflict() { conflictShown = true; }, onPersisted() { markedSaved = true; },
  mutationGuard: { tryStart: () => () => { released = true; } },
});
assert.equal(await persistence.persistDraft(), null);
assert.equal(replacedDraft, false);
assert.equal(replacedVersion, false);
assert.equal(markedSaved, false);
assert.equal(conflictShown, true);
assert.equal(released, true);
// A save landing between registry and content reads must not produce old metadata + new version.
const clientService = load('src/services/invitationPageService.ts') as typeof import('../src/services/invitationPageService');
for (const readEditable of [service.getServerEditableInvitationPageConfig, clientService.getEditableInvitationPageConfig]) {
  records.set(eventPath, { ...records.get(eventPath), published: false, visibility: { published: false }, defaultTheme: 'simple', hasCustomConfig: false, hasCustomContent: false });
  afterSummaryRead = () => {
    records.set(eventPath, { ...records.get(eventPath), published: true, visibility: { published: true }, defaultTheme: 'classic-r', hasCustomConfig: true, hasCustomContent: true });
    records.set(contentPath, { ...records.get(contentPath), version: 8, content: { ...config, displayName: 'New coherent snapshot' } });
  };
  const coherent = await readEditable(config.slug);
  assert.ok(coherent);
  assert.equal(coherent.version, 8);
  assert.equal(coherent.published, true, 'Publication state must come from the same snapshot as the content version.');
  assert.equal(coherent.defaultTheme, 'classic-r');
  assert.equal(coherent.hasCustomConfig, true);
  assert.equal(coherent.config.displayName, 'New coherent snapshot');
}

// Publication changes do not bump the content version; a customer save must preserve them.
const customerService = load('src/server/customerEventsService.ts') as typeof import('../src/server/customerEventsService');
records.set(eventPath, { ...records.get(eventPath), published: false, visibility: { published: false }, defaultTheme: 'simple', ownerUid: 'owner' });
const customerDraft = await service.getServerEditableInvitationPageConfig(config.slug);
afterEditableRead = () => {
  records.set(eventPath, { ...records.get(eventPath), published: true, visibility: { published: true }, defaultTheme: 'classic-r' });
};
const publicationSave = await customerService.saveCustomerEditableInvitationPageConfig('owner', config.slug, {
  config: { ...customerDraft.config, displayName: 'Customer preserves publication' }, expectedVersion: customerDraft.version,
  published: false, defaultTheme: 'simple',
});
assert.equal(publicationSave.config?.published, true, 'Customer save must preserve the publication state from its write transaction.');
assert.equal(publicationSave.config?.defaultTheme, 'classic-r', 'Customer save must preserve a concurrent default-theme change.');

const ownershipDraft = await service.getServerEditableInvitationPageConfig(config.slug);
afterEditableRead = () => {
  records.set(eventPath, { ...records.get(eventPath), ownerUid: 'new-owner' });
};
await assert.rejects(customerService.saveCustomerEditableInvitationPageConfig('owner', config.slug, {
  config: { ...ownershipDraft.config, displayName: 'Unauthorized stale owner' }, expectedVersion: ownershipDraft.version,
}), (error: { status?: number }) => error.status === 403);
assert.equal(records.get(contentPath)?.version, ownershipDraft.version, 'A stale owner must not commit content.');
assert.equal((records.get(contentPath)?.content as Data)?.displayName, 'Customer preserves publication');
records.set(eventPath, { ...records.get(eventPath), ownerUid: 'owner' });

const entitlementDraft = await service.getServerEditableInvitationPageConfig(config.slug);
afterEditableRead = () => {
  records.set(contentPath, {
    ...records.get(contentPath), productTier: 'premium', featureFlags: { maxGalleryImages: 18, shareMode: 'card', showMusic: true, showCountdown: true, showGuestbook: true },
    themeState: { defaultTheme: 'classic-r', variants: { simple: { available: true }, 'classic-r': { available: true } } },
  });
};
const entitlementSave = await customerService.saveCustomerEditableInvitationPageConfig('owner', config.slug, {
  config: { ...entitlementDraft.config, displayName: 'Customer preserves entitlement' }, expectedVersion: entitlementDraft.version,
});
assert.equal(entitlementSave.config?.productTier, 'premium', 'Customer save must retain the current product rights.');
assert.equal(entitlementSave.config?.features.maxGalleryImages, 18);
assert.equal(entitlementSave.config?.config.variants['classic-r']?.available, true);

unfilteredEventReads = 0;
const owned = await customerService.getCustomerEventOwnershipSnapshot('owner', config.slug);
assert.equal(owned.status, 'owner');
assert.equal(unfilteredEventReads, 0, 'Single ownership lookup must not scan every event.');
records.set('events/evt_other', { ...records.get(eventPath), eventId: 'evt_other', slug: 'other', ownerUid: 'other-owner' });
const ownedList = await customerService.listCustomerOwnedEventSummaries('owner');
assert.equal(ownedList.length, 1);
assert.equal(unfilteredEventReads, 0, 'Customer event listing must query only its owner.');
for (const [metadata, reason, isPublic] of [
  [{ published: false }, 'private', false],
  [{ published: true, displayPeriod: { isActive: false } }, 'public', true],
  [{ published: true, displayPeriod: { isActive: true, startDate: null, endDate: null } }, 'period-incomplete', false],
  [{ published: true, displayPeriod: { isActive: true, startDate: new Date('2099-01-01'), endDate: new Date('2099-02-01') } }, 'scheduled', false],
  [{ published: true, displayPeriod: { isActive: true, startDate: new Date('2020-01-01'), endDate: new Date('2020-02-01') } }, 'expired', false],
  [{ published: true, deletion: { jobId: 'deletion-job', status: 'running', currentStep: 'block-access', requestedAt: now.toISOString() } }, 'deleting', false],
] as const) {
  records.set(eventPath, { ...records.get(eventPath), visibility: { published: metadata.published }, displayPeriod: null, deletion: null, ...metadata });
  const summaries = await customerService.listCustomerOwnedEventSummaries('owner');
  assert.equal(summaries[0].publicAccess?.reason, reason);
  assert.equal(summaries[0].publicAccess?.isPublic, isPublic);
  if (reason !== 'deleting') {
    const editableSnapshot = await customerService.getCustomerEditableInvitationPageSnapshot('owner', config.slug);
    assert.equal(editableSnapshot.summary?.publicAccess?.reason, reason, 'Editable summary must expose the same public access state as the customer list.');
  }
}
records.set(eventPath, { ...records.get(eventPath), deletion: null, displayPeriod: null });
const commentPath = `${eventPath}/comments`;
for (const [id, status, scheduledDeleteAt] of [
  ['public-comment', 'public', null],
  ['hidden-comment', 'hidden', null],
  ['recoverable-comment', 'pending_delete', new Date('2099-01-01')],
  ['expired-comment', 'pending_delete', new Date('2020-01-01')],
] as const) {
  records.set(`${commentPath}/${id}`, { author: '고객', message: id, pageSlug: config.slug, status, scheduledDeleteAt, createdAt: now });
}
const managedComments = await customerService.listCustomerEventGuestbookComments('owner', config.slug);
assert.equal(managedComments.length, 3, 'Customer manager must list recoverable deleted comments and omit expired comments.');
assert.equal(managedComments.some((comment) => comment.id === 'recoverable-comment'), true);
await customerService.updateCustomerEventGuestbookCommentStatus('owner', config.slug, 'public-comment', 'hide');
assert.equal(records.get(`${commentPath}/public-comment`)?.status, 'hidden');
await customerService.updateCustomerEventGuestbookCommentStatus('owner', config.slug, 'recoverable-comment', 'restore');
assert.equal(records.get(`${commentPath}/recoverable-comment`)?.status, 'public');
assert.equal(records.get(`${commentPath}/recoverable-comment`)?.scheduledDeleteAt, null);
await assert.rejects(customerService.updateCustomerEventGuestbookCommentStatus('other-owner', config.slug, 'hidden-comment', 'restore'));
await assert.rejects(customerService.updateCustomerEventGuestbookCommentStatus('owner', config.slug, 'expired-comment', 'restore'));
assert.equal(records.get(`${commentPath}/expired-comment`)?.status, 'pending_delete');
console.log('invitation content concurrency checks passed');
