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
type Reference = { path: string; id: string; collection(name: string): { doc(id: string): Reference }; get(): Promise<Snapshot>; set(data: Data): Promise<Map<string, Data>> };
type Transaction = { get(reference: Reference): Promise<Snapshot>; set(reference: Reference, data: Data): void };
type ClientTransaction = { get(reference: Reference): Promise<Omit<Snapshot, 'exists'> & { exists(): boolean }>; set: Transaction['set'] };
const records = new Map<string, Data>();
const nativeRequire = createRequire(import.meta.url);
const modules = new Map<string, { exports: unknown }>();
let pending = Promise.resolve();
let afterSummaryRead: (() => void) | null = null;
let sendRequest: typeof fetch = async () => { throw new Error('Unexpected network request.'); };
function ref(documentPath: string): Reference {
  return {
    path: documentPath,
    id: documentPath.split('/').at(-1)!,
    collection: (name: string) => ({ doc: (id: string) => ref(`${documentPath}/${name}/${id}`) }),
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
  };
}
function snapshot(documentPath: string) {
  const value = structuredClone(records.get(documentPath));
  return { id: documentPath.split('/').at(-1)!, exists: Boolean(value), data: () => value };
}
const db = {
  collection: (name: string) => ({
    doc: (id: string) => ref(`${name}/${id}`),
    get: async () => ({ docs: [...records.keys()].filter((key) => key.startsWith(`${name}/`) && key.split('/').length === 2).map(snapshot) }),
  }),
  runTransaction(callback: (transaction: Transaction) => Promise<unknown>) {
    const result = pending.then(async () => {
      const writes: Array<[string, Data]> = [];
      const result = await callback({
        get: (reference: Reference) => Promise.resolve(snapshot(reference.path)),
        set: (reference: Reference, data: Data) => { writes.push([reference.path, structuredClone(data)]); },
      });
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
      if (id.endsWith('/firebaseAdmin')) return { getServerFirestore: () => db, getServerAuth: () => ({ verifyIdToken: async () => ({ uid: 'owner' }) }) };
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
console.log('invitation content concurrency checks passed');
