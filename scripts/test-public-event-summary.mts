import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as contentVersion from '../src/lib/invitationContentVersion.ts';

function load(file: string, dependencies: Record<string, unknown> = {}, globals: Record<string, unknown> = {}) {
  const exports: Record<string, unknown> = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, Date, Intl, ...globals, require: (id: string) => dependencies[id] ?? {} });
  return exports;
}
const deletion = load('src/server/eventDeletionPolicy.ts');
const publicAccess = load('src/lib/invitationPublicAccess.ts', { '@/server/eventDeletionPolicy': deletion });
const service = load('src/server/publicEventSummaryService.ts', { '@/lib/invitationPublicAccess': publicAccess }) as {
  getPublicEventSummary(slug: string, dependencies: { resolveEventBySlug: () => Promise<unknown> }): Promise<Record<string, unknown> | null>;
};
const base = {
  eventId: 'event-1', slug: 'public-event', eventType: 'wedding', title: 'Public title',
  displayName: 'Public name', summary: 'Description', published: true,
  defaultTheme: 'simple', supportedVariants: ['simple'], featureFlags: {}, hasCustomContent: true,
  visibility: { published: true, displayStartAt: null, displayEndAt: null },
  displayPeriod: null, ownerUid: 'customer-1', ownerEmail: 'private@example.test',
  ownerDisplayName: 'Private customer', security: { passwordVersion: 1 }, ticketBalance: 10,
};
async function read(overrides: Record<string, unknown> = {}) {
  return service.getPublicEventSummary('public-event', { resolveEventBySlug: async () => ({ summary: { ...base, ...overrides } }) });
}
const summary = await read();
assert.ok(summary);
assert.equal(summary.slug, 'public-event');
assert.equal(summary.displayName, 'Public name');
assert.equal(summary.eventId, 'event-1');
for (const privateField of ['ownerUid', 'ownerEmail', 'ownerDisplayName', 'security', 'ticketBalance', 'stats']) {
  assert.ok(!(privateField in summary), `Public response must exclude ${privateField}.`);
}
assert.equal(await read({ visibility: { published: false } }), null);
assert.equal(await read({ displayPeriod: { isActive: true, startDate: new Date('2000-01-01'), endDate: new Date('2000-02-01') } }), null);
assert.equal(await read({ displayPeriod: { isActive: true, startDate: new Date('2999-01-01'), endDate: new Date('2999-02-01') } }), null);
assert.equal(await read({ displayPeriod: { isActive: true, startDate: null, endDate: null } }), null);
assert.ok(await read({ displayPeriod: { isActive: false, startDate: new Date('2000-01-01'), endDate: new Date('2000-02-01') } }));
assert.equal(await read({ deletion: { status: 'running' } }), null);
assert.equal(await service.getPublicEventSummary('missing', { resolveEventBySlug: async () => null }), null);

// Exercise the real client mapper and resolver with root read permissions denied.
const clientMapper = load('src/services/repositories/mappers/clientEventRepositoryMapper.ts', {
  '@/lib/invitationContentVersion': contentVersion,
  '@/config/weddingPages': { getWeddingPageBySlug: () => null },
  '@/lib/eventTypes': { DEFAULT_EVENT_TYPE: 'wedding', normalizeEventTypeKey: (value: unknown, fallback: string) => value ?? fallback },
  '@/lib/invitationPageNormalization': { normalizeInvitationTheme: (value: unknown) => value ?? 'simple' },
  '@/lib/invitationPagePersistence': { normalizeInvitationConfigSeed: (slug: string, config: object) => ({ ...config, slug }) },
  '../clientFirestoreRepositoryCore': { toClientRepositoryDate: (value: unknown, fallback: Date) => value ? new Date(String(value)) : fallback },
});
let rootReadable = false;
let fetchCount = 0;
let publicStatus = 200;
const client = load('src/services/repositories/clientEventRepositoryCore.ts', {
  './clientFirestoreRepositoryCore': { ensureClientFirestoreState: async () => ({
    db: {}, modules: {
      doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
      getDoc: async (path: string) => {
        if (path === 'events/event-1' && !rootReadable) throw { code: 'permission-denied' };
        const data = path.startsWith('eventSlugIndex/')
          ? { slug: 'public-event', eventId: 'event-1', status: 'active' }
          : path.endsWith('/content/current') ? { content: { displayName: 'Public name' } } : base;
        return { exists: () => true, id: path.split('/').at(-1), data: () => data };
      },
    },
  }) },
  './mappers/clientEventRepositoryMapper': clientMapper,
}, {
  fetch: async (url: string) => {
    fetchCount++;
    assert.equal(url, '/api/public/events/public-event/');
    return { ok: publicStatus === 200, status: publicStatus, json: async () => ({ summary: JSON.parse(JSON.stringify(summary)) }) };
  },
}) as {
  resolveClientStoredEventBySlug(slug: string): Promise<{ summary: Record<string, unknown> } | null>;
  fetchClientEventContentBySlug(slug: string): Promise<{ config: Record<string, unknown> } | null>;
};
const publicContent = await client.fetchClientEventContentBySlug('public-event');
assert.equal(publicContent?.config.displayName, 'Public name');
assert.equal(fetchCount, 1);
rootReadable = true;
const owned = await client.resolveClientStoredEventBySlug('public-event');
assert.equal(owned?.summary.ownerEmail, 'private@example.test');
assert.equal(fetchCount, 1, 'Authorized owners/admins must keep the original Firestore path.');
rootReadable = false;
publicStatus = 404;
assert.equal(await client.fetchClientEventContentBySlug('public-event'), null);
console.log('public event summary privacy and access checks passed');
