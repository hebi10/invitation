import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Data = Record<string, unknown>;
type EventData = Data & {
  stats: { ticketBalance: number; ticketCount: number; commentCount: number };
  visibility: { published: boolean; displayStartAt: Date; displayEndAt: Date };
  displayPeriod: { isActive: boolean; startDate: Date; endDate: Date };
};
type Reference = {
  path: string;
  collection(name: string): { doc(id: string): Reference };
  get(): Promise<{ exists: boolean; id: string | undefined; data(): Data }>;
  set(data: Data): Promise<void>;
};
type Transaction = { get(ref: Reference): ReturnType<Reference['get']>; set(ref: Reference, data: Data): Promise<void> };
const source = ts.transpileModule(readFileSync('src/server/repositories/eventRepository.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const oldEnd = new Date('2026-10-01');
const newEnd = new Date('2026-11-01');
let current: EventData = {
  eventId: 'event-1', slug: 'example', eventType: 'wedding', ownerUid: 'old-owner',
  ownerEmail: 'old@example.test', ownerDisplayName: 'Old', title: 'Old title',
  published: true, defaultTheme: 'simple', supportedVariants: [], featureFlags: {},
  stats: { ticketBalance: 2, ticketCount: 2, commentCount: 3 },
  security: null, visibility: { published: true, displayStartAt: new Date('2026-09-01'), displayEndAt: oldEnd },
  displayPeriod: { isActive: true, startDate: new Date('2026-09-01'), endDate: oldEnd },
  hasCustomContent: true, createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01'),
  lastSavedAt: null, version: 1, migratedFromPageSlug: 'example',
};
const index = { slug: 'example', eventId: 'event-1', status: 'active', targetSlug: null };
let injectedConcurrentWrite = false;
let concurrentDeletion: 'none' | 'running' | 'completed' = 'none';
let rootDeleted = false;
function reference(path: string): Reference {
  return {
    path,
    collection: (name: string) => ({ doc: (id: string) => reference(`${path}/${name}/${id}`) }),
    get: async () => {
      const exists = path !== 'events/event-1' || !rootDeleted;
      const data = path === 'events/event-1' ? structuredClone(current) : index;
      if (path === 'events/event-1' && !injectedConcurrentWrite) {
        injectedConcurrentWrite = true;
        current = {
          ...current, ownerUid: 'new-owner', ownerEmail: 'new@example.test',
          stats: { ticketBalance: 1, ticketCount: 1, commentCount: 4 },
          displayPeriod: { ...current.displayPeriod, endDate: newEnd },
          visibility: { ...current.visibility, displayEndAt: newEnd }, version: 2,
        };
        if (concurrentDeletion === 'running') current.deletion = { status: 'running' };
        if (concurrentDeletion === 'completed') rootDeleted = true;
      }
      return { exists, id: path.split('/').at(-1), data: () => data };
    },
    set: async (value: Data) => { if (path === 'events/event-1') current = { ...current, ...value }; },
  };
}
const db = {
  collection: (name: string) => ({ doc: (id: string) => reference(`${name}/${id}`) }),
  runTransaction: async (callback: (tx: Transaction) => Promise<unknown>) => callback({
    get: (ref: Reference) => ref.get(),
    set: (ref: Reference, data: Data) => ref.set(data),
  }),
};
const exports = {} as { ensureEventMirrorBySlug(slug: string, options: Data): Promise<unknown> };
runInNewContext(source, { exports, Date, require(id: string) {
  if (id === '../firebaseAdmin') return { getServerFirestore: () => db };
  if (id.includes('invitationPagePersistence')) return { normalizeInvitationPageSlugInput: (s: string) => s.trim(), stripUndefinedDeep: (v: unknown) => v };
  if (id.includes('eventTypes')) return { DEFAULT_EVENT_TYPE: 'wedding', normalizeEventTypeKey: (v: string, fallback: string) => v ?? fallback };
  if (id.includes('invitationThemes')) return { DEFAULT_INVITATION_THEME: 'simple' };
  if (id === './eventSlugIndex') return { assertEventSlugIndexOwnership() {}, isReservedEventSlugIndexStatus: () => true };
  if (id === '../eventDeletionPolicy') return { isEventDeletionBlockingAccess: (deletion: Data | null) => deletion?.status === 'running' };
  if (id === './eventReadThroughDtos') return {
    normalizeEventSummaryRecord: (_id: string, data: Data) => ({ ...data, ...(data.stats as object) }),
    normalizeEventSlugIndexRecord: (_id: string, data: Data) => data,
    buildInvitationPageRegistryRecordFromEventSummary: (data: Data) => ({ published: data.published, defaultTheme: data.defaultTheme, hasCustomConfig: data.hasCustomContent }),
    buildInvitationPageDisplayPeriodRecordFromEventSummary: (data: Data) => data.displayPeriod,
    buildInvitationPageConfigRecordFromEventContent: () => null,
  };
  return {};
} });
await exports.ensureEventMirrorBySlug('example', {
  content: { config: { slug: 'example', displayName: 'Updated title', variants: {} }, updatedAt: new Date(), createdAt: new Date(), seedSourceSlug: null },
});
assert.equal(current.ownerUid, 'new-owner', 'Content save must preserve concurrent ownership assignment.');
assert.equal(current.ownerEmail, 'new@example.test');
assert.equal(current.stats.ticketBalance, 1, 'Content save must preserve ticket redemption.');
assert.equal(current.stats.commentCount, 4);
assert.equal(current.displayPeriod.endDate.getTime(), newEnd.getTime());
assert.equal(current.visibility.displayEndAt.getTime(), newEnd.getTime());
assert.equal(current.title, 'Updated title');
assert.equal(current.version, 3);
for (const state of ['running', 'completed'] as const) {
  concurrentDeletion = state;
  injectedConcurrentWrite = false;
  rootDeleted = false;
  current.deletion = null;
  await assert.rejects(
    exports.ensureEventMirrorBySlug('example', { forceCreate: true }),
    (error: { status?: number }) => error.status === (state === 'running' ? 409 : 404),
    'A save must not revive an event deleted after the initial slug lookup.'
  );
}
console.log('event summary concurrent write isolation checks passed');
