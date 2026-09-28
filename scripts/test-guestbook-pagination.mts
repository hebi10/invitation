import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as pagination from '../src/lib/guestbookPagination.ts';
import * as guestbook from '../src/lib/guestbookComments.ts';
import { Timestamp } from 'firebase-admin/firestore';
import type { EventCommentRepository } from '../src/server/repositories/eventCommentRepository.ts';
import { readPublicCommentPage, parseCommentPageRequest, paginateLegacyComments, encodeCommentCursor, decodeCommentCursor } from '../src/lib/guestbookPagination.ts';

assert.equal(parseCommentPageRequest(new URLSearchParams()), null, 'Legacy GET stays unpaginated');
assert.throws(() => parseCommentPageRequest(new URLSearchParams('limit=0')));
assert.throws(() => parseCommentPageRequest(new URLSearchParams('limit=5&cursor=a/b')));
assert.throws(() => parseCommentPageRequest(new URLSearchParams('limit=5.5')));
assert.deepEqual(parseCommentPageRequest(new URLSearchParams('limit=5')), { limit: 5, cursor: null });

const records = [
  { id: 'a', data: { status: 'hidden' } },
  { id: 'b', data: {} }, // Legacy status/date absent must remain visible.
  { id: 'c', data: { status: 'public', createdAt: new Date(0) } },
  { id: 'd', data: { status: 'pending_delete' } },
  { id: 'e', data: { status: 'public', createdAt: new Date(0) } },
];
const fetchBatch = async (cursor: string | null, limit: number) => records.filter(item => !cursor || item.id > cursor).slice(0, limit);
const first = await readPublicCommentPage({ limit: 2, cursor: null }, fetchBatch);
assert.deepEqual(first.comments.map(item => item.id), ['b', 'c']);
assert.equal(first.hasMore, true);
const second = await readPublicCommentPage({ limit: 2, cursor: first.nextCursor }, fetchBatch);
assert.deepEqual(second.comments.map(item => item.id), ['e']);
assert.equal(second.hasMore, false);
assert.equal(second.nextCursor, null);

let reads = 0;
const hidden = Array.from({ length: 200 }, (_, index) => ({ id: String(index).padStart(3, '0'), data: { status: 'hidden' } }));
const hiddenPage = await readPublicCommentPage({ limit: 5, cursor: null }, async (cursor, limit) => {
  reads += 1;
  return hidden.filter(item => !cursor || item.id > cursor).slice(0, limit);
});
assert.ok(reads <= 4, 'A request must not scan an unbounded hidden collection');
assert.equal(hiddenPage.comments.length, 0);
assert.equal(hiddenPage.hasMore, true);
assert.ok(hiddenPage.nextCursor);

const legacyRecords = [
  { id: 'old', data: {} },
  { id: 'b', data: { createdAt: new Date(2000) } },
  { id: 'a', data: { createdAt: new Date(2000) } },
  { id: 'newest', data: { createdAt: new Date(3000) } },
];
const legacyFirst = paginateLegacyComments(legacyRecords, { limit: 2, cursor: null });
assert.deepEqual(legacyFirst.comments.map(item => item.id), ['newest', 'b']);
const legacyNext = paginateLegacyComments(legacyRecords, { limit: 2, cursor: legacyFirst.nextCursor });
assert.deepEqual(legacyNext.comments.map(item => item.id), ['a', 'old']);
assert.equal(legacyNext.hasMore, false);
assert.deepEqual(paginateLegacyComments([...legacyRecords, { id: 'just-posted', data: { createdAt: new Date(4000) } }], { limit: 2, cursor: null }).comments.map(item => item.id), ['just-posted', 'newest']);
const precise = { mode: 'ordered' as const, id: 'same-time', seconds: 23, nanoseconds: 123456789 };
assert.deepEqual(decodeCommentCursor(encodeCommentCursor(precise)), precise);

const route = {} as { GET: (request: Request) => Promise<Response> };
let paginatedReads = 0;
let legacyReads = 0;
let published = true;
const comment = { id: 'one', pageSlug: 'sample', data: { author: '하객', message: '축하합니다', createdAt: new Date(0) } };
runInNewContext(ts.transpileModule(readFileSync('src/app/api/guestbook/comments/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: route, Date, URL, console, require(name: string) {
  if (name === 'next/server') return { NextResponse: Response };
  if (name.endsWith('/guestbookPagination')) return pagination;
  if (name.endsWith('/guestbookComments')) return guestbook;
  if (name.endsWith('/invitationPagePersistence')) return { normalizeInvitationPageSlugInput: (slug: string) => slug };
  if (name.endsWith('/eventRepository')) return { resolveStoredEventBySlug: async () => ({ summary: { visibility: { published } } }) };
  if (name.endsWith('/eventCommentRepository')) return { firestoreEventCommentRepository: {
    isAvailable: () => true,
    listByPageSlug: async () => { legacyReads++; return [comment]; },
    listPublicPageBySlug: async () => { paginatedReads++; return { comments: [comment], nextCursor: null, hasMore: false }; },
  } };
  return {};
} });
const legacyResponse = await (await route.GET(new Request('https://example.test/api/guestbook/comments?pageSlug=sample'))).json();
assert.deepEqual(Object.keys(legacyResponse).sort(), ['comments', 'success']);
assert.equal(legacyReads, 1);
assert.equal(paginatedReads, 0);
const pageResponse = await (await route.GET(new Request('https://example.test/api/guestbook/comments?pageSlug=sample&limit=5'))).json();
assert.equal(pageResponse.hasMore, false);
assert.equal(pageResponse.comments[0].id, 'one');
assert.equal(paginatedReads, 1);
assert.equal(legacyReads, 1);
assert.equal((await route.GET(new Request('https://example.test/api/guestbook/comments?pageSlug=sample&limit=99'))).status, 400);
published = false;
assert.equal((await route.GET(new Request('https://example.test/api/guestbook/comments?pageSlug=sample&limit=5'))).status, 403);
assert.equal(paginatedReads, 1, 'Private invitations must never read paginated messages');

const source = ts.transpileModule(readFileSync('src/server/repositories/eventCommentRepository.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let rows: Array<{ id: string; data: Record<string, unknown> }> = [
  { id: 'b', data: { createdAt: Timestamp.fromMillis(2000) } },
  { id: 'a', data: { createdAt: Timestamp.fromMillis(2000) } },
  { id: 'old', data: { createdAt: Timestamp.fromMillis(1000) } },
];
let countReads = 0;
let fullReads = 0;
let limitedReads = 0;
function query(ordered = false, after: [Timestamp, string] | null = null, limit: number | null = null, datesOnly = false) {
  const getRows = () => {
    let selected = rows.filter(item => !ordered || 'createdAt' in item.data).filter(item => !datesOnly || item.data.createdAt instanceof Timestamp);
    if (ordered) selected = [...selected].sort((a, b) => (b.data.createdAt as Timestamp).toMillis() - (a.data.createdAt as Timestamp).toMillis() || b.id.localeCompare(a.id));
    if (after) selected = selected.filter(item => (item.data.createdAt as Timestamp).toMillis() < after[0].toMillis() || ((item.data.createdAt as Timestamp).toMillis() === after[0].toMillis() && item.id < after[1]));
    return limit === null ? selected : selected.slice(0, limit);
  };
  return {
    doc: () => ({ collection: () => query() }),
    orderBy: () => query(true, after, limit, datesOnly),
    where: () => query(ordered, after, limit, true),
    startAfter: (time: Timestamp, id: string) => query(ordered, [time, id], limit, datesOnly),
    limit: (value: number) => query(ordered, after, value, datesOnly),
    count: () => ({ get: async () => { countReads++; return { data: () => ({ count: getRows().length }) }; } }),
    get: async () => {
      if (limit === null) fullReads++; else limitedReads++;
      return { docs: getRows().map(item => ({ id: item.id, data: () => item.data })) };
    },
  };
}
const repositoryExports = {} as { firestoreEventCommentRepository: EventCommentRepository };
runInNewContext(source, { exports: repositoryExports, Date, Promise, require(name: string) {
  if (name === 'firebase-admin/firestore') return { Timestamp, FieldPath: { documentId: () => '__name__' } };
  if (name.endsWith('/guestbookPagination')) return pagination;
  if (name === '../firebaseAdmin') return { getServerFirestore: () => ({ collection: () => query() }) };
  if (name === './eventRepository') return { EVENTS_COLLECTION: 'events', resolveStoredEventBySlug: async () => ({ summary: { eventId: 'event-1' } }) };
  if (name === './eventReadThroughDtos') return { buildEventCommentRecordFromEventDoc: (_summary: unknown, id: string, data: Record<string, unknown>) => ({ id, data, pageSlug: 'sample' }) };
  return {};
} });
const repository = repositoryExports.firestoreEventCommentRepository;
const orderedFirst = await repository.listPublicPageBySlug('sample', { limit: 1, cursor: null });
assert.deepEqual(orderedFirst.comments.map(item => item.id), ['b']);
const countsAfterFirst = countReads;
const orderedNext = await repository.listPublicPageBySlug('sample', { limit: 1, cursor: orderedFirst.nextCursor });
assert.deepEqual(orderedNext.comments.map(item => item.id), ['a']);
assert.equal(countReads, countsAfterFirst, 'Cursor requests must skip compatibility aggregation');
assert.equal(fullReads, 0, 'Normal invitations must never fetch the entire collection');
assert.ok(limitedReads > 0);
rows.push({ id: 'just-posted', data: { createdAt: Timestamp.fromMillis(3000) } });
assert.equal((await repository.listPublicPageBySlug('sample', { limit: 1, cursor: null })).comments[0].id, 'just-posted');
rows.push({ id: 'legacy', data: {} });
const compatible = await repository.listPublicPageBySlug('sample', { limit: 10, cursor: null });
assert.ok(compatible.comments.some(item => item.id === 'legacy'));
assert.equal(fullReads, 1);
rows = rows.filter(item => item.id !== 'legacy');
rows.push({ id: 'null-date', data: { createdAt: null } });
const nullDatePage = await repository.listPublicPageBySlug('sample', { limit: 10, cursor: null });
assert.ok(nullDatePage.comments.some(item => item.id === 'null-date'));
console.log('guestbook pagination tests passed');
