import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the real repository with in-memory Firestore IO only.
type Data = Record<string, unknown>;
type Ref = { path: string; id: string; get(): Promise<Snapshot>; set(data: Data): Promise<void> };
type Snapshot = { id: string; exists: boolean; data(): Data | undefined };
type Transaction = { get(reference: Ref): Promise<Snapshot>; set(reference: Ref, data: Data): void };
const records = new Map<string, Data>();
const eventPath = 'events/evt_assignment-test';
let pending = Promise.resolve();
let afterMirror: (() => void) | null = null;
function snapshot(documentPath: string): Snapshot {
  const value = structuredClone(records.get(documentPath));
  return { id: documentPath.split('/').at(-1)!, exists: Boolean(value), data: () => value };
}
function ref(documentPath: string): Ref {
  return {
    path: documentPath, id: documentPath.split('/').at(-1)!,
    get: async () => snapshot(documentPath),
    set: async (data) => { records.set(documentPath, { ...records.get(documentPath), ...structuredClone(data) }); },
  };
}
const db = {
  collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
  runTransaction(callback: (transaction: Transaction) => Promise<unknown>) {
    const result = pending.then(async () => {
      const writes: Array<[string, Data]> = [];
      const result = await callback({
        get: async (reference) => snapshot(reference.path),
        set: (reference, data) => { writes.push([reference.path, structuredClone(data)]); },
      });
      for (const [documentPath, data] of writes) records.set(documentPath, { ...records.get(documentPath), ...data });
      if (afterMirror && writes.some(([documentPath]) => documentPath === eventPath)) {
        const interleave = afterMirror;
        afterMirror = null;
        interleave();
      }
      return result;
    });
    pending = result.then(() => undefined, () => undefined);
    return result;
  },
};
const nativeRequire = createRequire(import.meta.url);
const modules = new Map<string, { exports: unknown }>();
const overrides = new Map<string, unknown>();
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
    module: loaded, exports: loaded.exports, Date, Error, console, Buffer, URL, process: { env: {} },
    require(id: string) {
      if (overrides.has(id)) return overrides.get(id);
      if (id === 'server-only') return {};
      if (id.endsWith('/firebaseAdmin')) return { getServerFirestore: () => db };
      if (id.startsWith('@/')) return load(path.resolve('src', id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id));
      return nativeRequire(id);
    },
  });
  return loaded.exports;
}
const repositoryModule = load('src/server/repositories/eventRepository.ts') as typeof import('../src/server/repositories/eventRepository');
const repository = repositoryModule.firestoreEventRepository;
function seed(ownerUid: string | null = null) {
  records.clear();
  afterMirror = null;
  records.set('eventSlugIndex/assignment-test', { slug: 'assignment-test', eventId: 'evt_assignment-test', status: 'active' });
  records.set(eventPath, {
    eventId: 'evt_assignment-test', slug: 'assignment-test', eventType: 'wedding',
    ownerUid, ownerEmail: ownerUid ? `${ownerUid}@example.com` : null,
    published: false, defaultTheme: 'simple', createdAt: new Date(), updatedAt: new Date(),
  });
}
const assign = (ownerUid: string) => repository.assignOwnerBySlug({ pageSlug: 'assignment-test', ownerUid, ownerEmail: `${ownerUid}@example.com` });

seed();
// The invitation commits after the administrator's earlier reads, before its owner write.
afterMirror = () => records.set(eventPath, { ...records.get(eventPath), ownerUid: 'invite-customer', ownerEmail: 'invite@example.com' });
await assert.rejects(assign('admin-selected-customer'), (error: unknown) => (error as { status?: number }).status === 409);
assert.equal(records.get(eventPath)?.ownerUid, 'invite-customer', 'A completed invitation claim must never be overwritten.');
assert.equal(records.get(eventPath)?.ownerEmail, 'invite@example.com');

seed();
const assignments = await Promise.allSettled([assign('customer-a'), assign('customer-b')]);
assert.equal(assignments.filter((result) => result.status === 'fulfilled').length, 1, 'Only one different customer may acquire an unassigned event.');
assert.equal(assignments.filter((result) => result.status === 'rejected').length, 1);
const owner = records.get(eventPath)?.ownerUid as string;
await assign(owner);
assert.equal(records.get(eventPath)?.ownerUid, owner, 'Assigning the same owner remains supported.');

seed();
afterMirror = () => records.set(eventPath, {
  ...records.get(eventPath),
  deletion: { jobId: 'deletion-test', status: 'running', currentStep: 'block-access', requestedAt: new Date().toISOString() },
});
await assert.rejects(assign('customer'), (error: unknown) => (error as { status?: number }).status === 409);
assert.equal(records.get(eventPath)?.ownerUid, null, 'Deletion beginning between reads must block assignment.');

seed();
afterMirror = () => { records.delete(eventPath); };
await assert.rejects(assign('customer'), (error: unknown) => (error as { status?: number }).status === 404);
assert.equal(records.has(eventPath), false, 'A removed event must not be recreated by the ownership write.');

// Exercise the actual API's safe error mapping without authentication/network IO.
class MockAdminApiAuthError extends Error {}
const routeState: { error?: unknown } = {};
overrides.set('@/server/adminApiAuth', { verifyAdminRequest: async () => ({ uid: 'admin' }), AdminApiAuthError: MockAdminApiAuthError });
overrides.set('@/server/adminCustomerAccountsService', {
  assignAdminCustomerEventOwnership: async () => { if (routeState.error) throw routeState.error; return assign('route-customer'); },
  EventOwnerAssignmentError: repositoryModule.EventOwnerAssignmentError,
});
overrides.set('next/server', { NextResponse: { json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, body }) } });
const route = load('src/app/api/admin/customers/ownership/route.ts') as { POST(request: unknown): Promise<{ status: number; body: { error?: string } }> };
const request = { json: async () => ({ action: 'assign', uid: 'route-customer', pageSlug: 'assignment-test' }) };
seed();
afterMirror = () => records.set(eventPath, { ...records.get(eventPath), ownerUid: 'invite-customer' });
const conflictResponse = await route.POST(request);
assert.equal(conflictResponse.status, 409, 'The administrator must receive an actionable ownership conflict.');
assert.match(conflictResponse.body.error!, /다른 고객/);
seed();
afterMirror = () => { records.delete(eventPath); };
assert.equal((await route.POST(request)).status, 404);
routeState.error = Object.assign(new Error('Internal database details must stay private'), { status: 409 });
const unexpectedResponse = await route.POST(request);
assert.equal(unexpectedResponse.status, 500, 'Unrecognized errors must not become public based only on a status property.');
assert.doesNotMatch(unexpectedResponse.body.error!, /Internal database/);
console.log('admin owner assignment concurrency and API checks passed');
