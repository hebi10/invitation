import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type Data = Record<string, unknown>;
type Ref = { path: string; id: string };
const records = new Map<string, Data>();
const eventPath = 'events/evt_design-test';
let admin = true;
let failWrite = false;
let beforeTransaction: (() => void) | null = null;
const writes: Data[] = [];
const snapshot = (ref: Ref) => {
  const data = structuredClone(records.get(ref.path));
  return { id: ref.id, exists: () => Boolean(data), data: () => data };
};
const firestore = { db: {}, modules: {
  doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/'), id: parts.at(-1)! }),
  getDoc: async (ref: Ref) => snapshot(ref),
  setDoc: async (ref: Ref, value: Data) => {
    beforeTransaction?.(); beforeTransaction = null;
    if (failWrite) throw new Error('network unavailable');
    writes.push(structuredClone(value));
    records.set(ref.path, { ...records.get(ref.path), ...structuredClone(value) });
  },
  collection: (_db: unknown, name: string) => name,
  where: () => ({}), query: () => ({}), getDocs: async () => ({ docs: [] }),
  runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
    beforeTransaction?.(); beforeTransaction = null;
    return callback({
      get: async (ref: Ref) => snapshot(ref),
      update: (ref: Ref, patch: Data) => {
        if (failWrite) throw new Error('network unavailable');
        writes.push(structuredClone(patch));
        const next = structuredClone(records.get(ref.path)!);
        for (const [key, value] of Object.entries(patch)) {
          const parts = key.split('.');
          if (parts.length === 2) (next[parts[0]] as Data)[parts[1]] = structuredClone(value);
          else next[key] = structuredClone(value);
        }
        records.set(ref.path, next);
      },
    });
  },
} };
const nativeRequire = createRequire(import.meta.url);
const modules = new Map<string, { exports: unknown }>();
function load(file: string): unknown {
  let absolute = path.resolve(file);
  if (!existsSync(absolute)) absolute += '.ts';
  if (modules.has(absolute)) return modules.get(absolute)!.exports;
  const loaded = { exports: {} };
  modules.set(absolute, loaded);
  const code = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, { module: loaded, exports: loaded.exports, Date, Error, console, URL,
    process: { env: { NEXT_PUBLIC_USE_FIREBASE: 'true' } },
    require(id: string) {
      if (id === 'server-only') return {};
      if (id === '@/lib/firebase') return { USE_FIREBASE: true, ensureFirebaseInit: async () => ({ auth: null }) };
      if (id === './adminAuth') return { refreshCurrentFirebaseSession: async () => ({ isAdmin: admin }) };
      if (id === './clientFirestoreRepositoryCore' || id === '../clientFirestoreRepositoryCore') return {
        ensureClientFirestoreState: async () => firestore,
        toClientRepositoryDate: (value: unknown, fallback: Date = new Date()) => value instanceof Date ? value : fallback,
      };
      if (id.startsWith('@/')) return load(path.resolve('src', id.slice(2)));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id));
      return nativeRequire(id);
    },
  });
  return loaded.exports;
}
const service = load('src/services/invitationPageService.ts') as typeof import('../src/services/invitationPageService');
function seed() {
  records.clear(); writes.length = 0; admin = true; failWrite = false; beforeTransaction = null;
  records.set('eventSlugIndex/design-test', { slug: 'design-test', eventId: 'evt_design-test', eventType: 'wedding', status: 'active' });
  records.set(eventPath, {
    eventId: 'evt_design-test', slug: 'design-test', eventType: 'wedding', defaultTheme: 'simple',
    published: false, visibility: { published: false, displayStartAt: new Date('2026-10-01'), displayEndAt: new Date('2026-10-30') },
    displayPeriod: { isActive: true, startDate: new Date('2026-10-01'), endDate: new Date('2026-10-30') },
    ownerUid: 'customer-before', ownerEmail: 'before@example.test', stats: { ticketBalance: 2, commentCount: 3 },
    security: { hasPassword: true }, title: '기존 행사', version: 7, updatedAt: new Date('2026-10-01'),
  });
  const config = (load('src/config/weddingPages.ts') as typeof import('../src/config/weddingPages')).getRequiredWeddingPageBySlug('kim-shinlang-na-sinbu');
  records.set(`${eventPath}/content/current`, { version: 11, content: { ...config, slug: 'design-test' } });
}

const periods = load('src/services/displayPeriodService.ts') as typeof import('../src/services/displayPeriodService');
const start = new Date('2026-11-01');
const end = new Date('2026-12-01');
seed();
beforeTransaction = () => Object.assign(records.get(eventPath)!, {
  published: true, visibility: { published: true, displayStartAt: null, displayEndAt: null },
  defaultTheme: 'romantic', ownerUid: 'customer-after', version: 14,
});
await periods.setDisplayPeriod('design-test', start, end, true);
let saved = records.get(eventPath)!;
assert.equal(saved.published, true, '기간 저장은 동시 공개 변경을 덮어쓰지 않아야 합니다.');
assert.equal((saved.visibility as Data).published, true);
assert.equal(saved.defaultTheme, 'romantic');
assert.equal(saved.ownerUid, 'customer-after');
assert.equal(saved.version, 14, '기간 변경은 편집 내용 버전을 변경하지 않아야 합니다.');
assert.equal(((saved.visibility as Data).displayStartAt as Date).getTime(), start.getTime());
assert.equal((saved.displayPeriod as Data).isActive, true);
assert.equal(writes.length, 1, '기간은 한 번의 원자적 쓰기로 저장해야 합니다.');
assert.equal(Object.keys(writes[0]).some((key) => key.includes('published')), false);

seed();
beforeTransaction = () => Object.assign(records.get(eventPath)!, {
  defaultTheme: 'romantic', displayPeriod: { isActive: true, startDate: start, endDate: end },
  visibility: { published: false, displayStartAt: start, displayEndAt: end }, ownerUid: 'customer-after',
});
await service.setInvitationPagePublished('design-test', true);
saved = records.get(eventPath)!;
assert.equal(saved.published, true);
assert.equal((saved.visibility as Data).published, true);
assert.equal(saved.defaultTheme, 'romantic');
assert.equal(saved.ownerUid, 'customer-after');
assert.equal(((saved.visibility as Data).displayEndAt as Date).getTime(), end.getTime());
assert.equal(saved.version, 7);
assert.deepEqual(Object.keys(writes[0]).sort(), ['published', 'updatedAt', 'visibility.published']);
assert.equal(writes.length, 1);

seed();
await periods.deleteDisplayPeriod('design-test');
saved = records.get(eventPath)!;
assert.equal(saved.published, false, '기간 해제로 비공개 이벤트가 공개되면 안 됩니다.');
assert.equal((saved.displayPeriod as Data).isActive, false);
assert.equal((saved.visibility as Data).displayStartAt, null);
assert.equal((saved.visibility as Data).displayEndAt, null);
assert.equal(saved.version, 7);

seed();
await assert.rejects(periods.setDisplayPeriod('design-test', end, start, true), /기간/);
await assert.rejects(periods.setDisplayPeriod('design-test', new Date('invalid'), end, true), /기간/);
assert.equal(writes.length, 0);
seed();
beforeTransaction = () => { records.delete(eventPath); };
await assert.rejects(service.setInvitationPagePublished('design-test', true), /찾을 수/);
assert.equal(records.has(eventPath), false, '삭제된 이벤트를 복구하면 안 됩니다.');
seed();
beforeTransaction = () => { records.get('eventSlugIndex/design-test')!.status = 'deleted'; };
await assert.rejects(service.setInvitationPagePublished('design-test', true), /주소/);
assert.equal(writes.length, 0);
seed(); failWrite = true;
await assert.rejects(periods.setDisplayPeriod('design-test', start, end, true), /network unavailable/);
assert.equal(records.get(eventPath)?.published, false);
failWrite = false;
await periods.setDisplayPeriod('design-test', start, end, true);
assert.equal((records.get(eventPath)?.displayPeriod as Data).isActive, true);
assert.equal(records.get(`${eventPath}/content/current`)?.version, 11);
console.log('Admin visibility and period atomic field isolation checks passed');
