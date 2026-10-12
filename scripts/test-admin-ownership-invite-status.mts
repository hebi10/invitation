import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { NextResponse } from 'next/server';
import ts from 'typescript';

import { normalizeInvitationPageSlugInput } from '../src/lib/invitationPagePersistence.ts';
import { AdminApiAuthError, verifyAdminRequest } from '../src/server/adminApiAuth.ts';
import { toSafeHttpErrorResponse } from '../src/server/apiErrorResponse.ts';
import * as policy from '../src/server/eventOwnershipInvitePolicy.ts';
import * as deletionPolicy from '../src/server/eventDeletionPolicy.ts';

type Data = Record<string, unknown>;
type Status = { status: 'not-issued' | 'pending' | 'expired' | 'consumed' | 'unavailable'; createdAt: Date | null; expiresAt: Date | null; consumedAt: Date | null };
function loadModule<T>(file: string, dependencies: Record<string, unknown>, extra: Record<string, unknown> = {}): T {
  const exports = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, Date, URL, Response, console: { error() {} }, ...extra, require(id: string) {
    if (id === 'server-only') return {};
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected status dependency: ${id}`);
  } });
  return exports as T;
}

const now = new Date('2026-10-12T00:00:00.000Z');
const createdAt = new Date('2026-10-11T00:00:00.000Z');
const expiresAt = new Date('2026-10-18T00:00:00.000Z');
const consumedAt = new Date('2026-10-11T12:00:00.000Z');
let invite: Data | null = null;
let inviteReads = 0;
let eventMissing = false;
let storeAvailable = true;
let eventDeletion: Data | null = null;
let ownerUid: string | null = null;
let ownerAdminEnabled: boolean | null = null;
const resolveEventBySlug = async (slug: string) => {
  assert.equal(slug, 'test-event');
  return eventMissing ? null : { summary: { eventId: 'event-1', slug, displayName: '고객 연결', deletion: eventDeletion } };
};
const db = {
  getAll: async (...refs: Array<{ get(): Promise<unknown> }>) => Promise.all(refs.map((ref) => ref.get())),
  collection(name: string) {
    if (name === 'admin-users') {
      return { doc(uid: string) {
        assert.equal(uid, ownerUid);
        return { get: async () => ({ exists: ownerAdminEnabled !== null, data: () => ({ enabled: ownerAdminEnabled }) }) };
      } };
    }
    assert.equal(name, 'events');
    return { doc(eventId: string) {
      assert.equal(eventId, 'event-1');
      return { get: async () => ({ exists: !eventMissing, data: () => ({ ownerUid }) }), collection(name: string) {
        assert.equal(name, 'ownershipInvites');
        return { doc(id: string) {
          assert.equal(id, 'current');
          return { get: async () => {
            inviteReads += 1;
            return { exists: invite !== null, data: () => invite };
          } };
        } };
      } };
    } };
  },
};
const repository = loadModule<{
  getStoredEventOwnershipInviteStatus(input: { pageSlug: string; now: Date }): Promise<Status>;
  EventOwnershipInviteError: new (status: number, code: string, message: string) => Error & { status: number };
}>('src/server/repositories/eventOwnershipInviteRepository.ts', {
  '../firebaseAdmin': { getServerFirestore: () => storeAvailable ? db : null },
  '../eventOwnershipInvitePolicy': policy,
  './eventRepository': { EVENTS_COLLECTION: 'events', resolveStoredEventBySlug: resolveEventBySlug },
});
assert.equal(typeof repository.getStoredEventOwnershipInviteStatus, 'function', 'Administrator metadata status reader must exist.');
for (const [record, status, expectedCreatedAt, expectedExpiresAt, expectedConsumedAt] of [
  [null, 'not-issued', null, null, null],
  [{ status: 'active', createdAt, expiresAt, consumedAt: null }, 'pending', createdAt, expiresAt, null],
  [{ status: 'active', createdAt, expiresAt: now, consumedAt: null }, 'expired', createdAt, now, null],
  [{ status: 'consumed', createdAt, expiresAt: now, consumedAt }, 'consumed', createdAt, now, consumedAt],
] as const) {
  invite = record;
  const result = await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now });
  assert.equal(result.status, status);
  assert.equal(result.createdAt?.getTime() ?? null, expectedCreatedAt?.getTime() ?? null);
  assert.equal(result.expiresAt?.getTime() ?? null, expectedExpiresAt?.getTime() ?? null);
  assert.equal(result.consumedAt?.getTime() ?? null, expectedConsumedAt?.getTime() ?? null);
  assert.deepEqual(Object.keys(result).sort(), ['consumedAt', 'createdAt', 'expiresAt', 'status'], 'Metadata must not expose token hashes or identities.');
}
// Stored secrets must not affect or leak into the administrator metadata response.
invite = { status: 'active', createdAt, expiresAt, consumedAt: null, tokenHash: 'private-hash', token: 'private-token', createdByUid: 'private-admin', consumedByUid: 'private-customer' };
assert.doesNotMatch(JSON.stringify(await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })), /private-/);

// A direct ownership assignment blocks an active link without consuming its invite document.
ownerUid = 'directly-linked-customer';
assert.equal((await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })).status, 'unavailable');
assert.equal(invite.status, 'active', 'Status inspection must not consume or modify the invite.');
ownerUid = null;
assert.equal((await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })).status, 'pending', 'Clearing ownership restores the active link availability.');
ownerUid = 'admin-owner';
ownerAdminEnabled = true;
assert.equal((await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })).status, 'pending', 'An enabled administrator owner remains eligible for customer connection.');
ownerAdminEnabled = false;
assert.equal((await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })).status, 'unavailable', 'A disabled administrator must not bypass the customer ownership boundary.');
ownerUid = 'directly-linked-customer';
ownerAdminEnabled = null;
invite = { status: 'active', createdAt, expiresAt: now, consumedAt: null };
assert.equal((await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })).status, 'expired', 'Expiry takes precedence over the ownership boundary.');
invite = { status: 'consumed', createdAt, expiresAt: now, consumedAt };
assert.equal((await repository.getStoredEventOwnershipInviteStatus({ pageSlug: 'test-event', now })).status, 'consumed', 'Consumption takes precedence over expiry and ownership.');
ownerUid = null;

const service = loadModule<{
  getAdminEventOwnershipInviteStatus(input: { pageSlug: string; now?: Date }): Promise<Status>;
}>('src/server/eventOwnershipInviteService.ts', {
  '@/lib/invitationPagePersistence': { normalizeInvitationPageSlugInput },
  './eventDeletionPolicy': deletionPolicy,
  './eventOwnershipInvitePolicy': policy,
  './repositories/eventOwnershipInviteRepository': repository,
  './repositories/eventRepository': { resolveStoredEventBySlug: resolveEventBySlug },
});
const route = loadModule<{
  GET(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response>;
}>('src/app/api/admin/events/[slug]/ownership-invite/route.ts', {
  'next/server': { NextResponse },
  '@/lib/invitationPagePersistence': { normalizeInvitationPageSlugInput },
  '@/server/adminApiAuth': {
    AdminApiAuthError,
    verifyAdminRequest: (request: Request) => verifyAdminRequest(request, {
      auth: { verifyIdToken: async (token) => ({ uid: token }) },
      isAdminEnabled: async (uid) => uid === 'admin',
    }),
  },
  '@/server/apiErrorResponse': { toSafeHttpErrorResponse },
  '@/server/eventOwnershipInviteService': { ...service, EventOwnershipInviteError: repository.EventOwnershipInviteError },
  '@/server/requestRateLimit': {},
});
const context = { params: Promise.resolve({ slug: 'test-event' }) };
function request(token?: string) {
  return new Request('https://example.test/api/admin/events/test-event/ownership-invite', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
inviteReads = 0;
for (const [token, expectedStatus] of [[undefined, 401], ['customer', 403]] as const) {
  const response = await route.GET(request(token), context);
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get('cache-control'), 'no-store');
}
assert.equal(inviteReads, 0, 'Unauthorized GET requests must never read invite metadata.');
invite = { status: 'consumed', createdAt, expiresAt, consumedAt, tokenHash: 'private-hash' };
const response = await route.GET(request('admin'), context);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store');
assert.deepEqual(await response.json(), { status: 'consumed', createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(), consumedAt: consumedAt.toISOString() });
eventMissing = true;
assert.equal((await route.GET(request('admin'), context)).status, 404);
eventMissing = false;
storeAvailable = false;
assert.equal((await route.GET(request('admin'), context)).status, 503);
storeAvailable = true;
eventDeletion = { jobId: 'delete-job', requestedAt: now.toISOString(), status: 'running', currentStep: 'block-access' };
assert.equal((await route.GET(request('admin'), context)).status, 409);
eventDeletion = null;

let clientToken: string | null = 'admin';
let clientResponseStatus = 'pending';
let requests = 0;
const client = loadModule<{ getAdminOwnershipInviteStatus(slug: string): Promise<Status> }>(
  'src/services/eventOwnershipInviteService.ts', {
    '@/lib/invitationPagePersistence': { normalizeInvitationPageSlugInput },
    './adminAuth': { getCurrentFirebaseIdToken: async () => clientToken },
  }, {
    fetch: async (url: string, init: RequestInit) => {
      assert.equal(url, '/api/admin/events/test-event/ownership-invite');
      assert.equal(init.method, 'GET');
      assert.equal((init.headers as { Authorization?: string }).Authorization, 'Bearer admin');
      assert.equal(init.cache, 'no-store');
      requests += 1;
      return Response.json({ status: clientResponseStatus, createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(), consumedAt: null });
    },
  }
);
const clientStatus = await client.getAdminOwnershipInviteStatus('test-event');
assert.equal(clientStatus.status, 'pending');
assert.equal(clientStatus.createdAt?.getTime(), createdAt.getTime());
assert.equal(clientStatus.expiresAt?.getTime(), expiresAt.getTime());
assert.equal(clientStatus.consumedAt, null);
clientResponseStatus = 'unavailable';
assert.equal((await client.getAdminOwnershipInviteStatus('test-event')).status, 'unavailable');
clientToken = null;
await assert.rejects(client.getAdminOwnershipInviteStatus('test-event'));
assert.equal(requests, 2, 'Missing administrator session must not send a status request.');
console.log('administrator ownership invite metadata status checks passed');
