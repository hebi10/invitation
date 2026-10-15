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
  collection: (_db: unknown, name: string) => name,
  where: () => ({}), query: () => ({}), getDocs: async () => ({ docs: [] }),
  runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
    beforeTransaction?.(); beforeTransaction = null;
    return callback({
      get: async (ref: Ref) => snapshot(ref),
      update: (ref: Ref, patch: Data) => {
        if (failWrite) throw new Error('network unavailable');
        writes.push(structuredClone(patch));
        records.set(ref.path, { ...records.get(ref.path), ...structuredClone(patch) });
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
  records.set(`${eventPath}/content/current`, { version: 11, content: { title: '내용 보존' } });
}
seed();
beforeTransaction = () => records.set(eventPath, {
  ...records.get(eventPath), published: true, visibility: { published: true, displayStartAt: null, displayEndAt: new Date('2026-11-30') },
  displayPeriod: { isActive: true, startDate: null, endDate: new Date('2026-11-30') }, ownerUid: 'customer-after', ownerEmail: 'after@example.test',
});
const contentBefore = structuredClone(records.get(`${eventPath}/content/current`));
await service.setAdminInvitationPageDefaultTheme('design-test', 'romantic');
assert.equal(records.get(eventPath)?.defaultTheme, 'romantic');
assert.equal(records.get(eventPath)?.published, true, '동시 공개 상태 변경을 보존해야 합니다.');
assert.equal((records.get(eventPath)?.visibility as Data).published, true);
assert.equal((records.get(eventPath)?.displayPeriod as Data).endDate instanceof Date, true);
assert.equal(((records.get(eventPath)?.displayPeriod as Data).endDate as Date).getTime(), new Date('2026-11-30').getTime());
assert.equal(records.get(eventPath)?.ownerUid, 'customer-after');
assert.equal(records.get(eventPath)?.ownerEmail, 'after@example.test');
assert.equal(records.get(eventPath)?.version, 7, '메타데이터 변경은 기존 내용 버전을 변경하지 않아야 합니다.');
assert.deepEqual(records.get(`${eventPath}/content/current`), contentBefore);
assert.deepEqual(Object.keys(writes[0]).sort(), ['defaultTheme', 'updatedAt'], '기본 디자인과 수정 시각만 저장해야 합니다.');

seed(); admin = false;
await assert.rejects(service.setAdminInvitationPageDefaultTheme('design-test', 'romantic'), /관리자/);
assert.equal(writes.length, 0);
seed();
await assert.rejects(service.setAdminInvitationPageDefaultTheme('design-test', 'birthday-minimal'), /디자인/);
assert.equal(writes.length, 0);
seed(); records.get(eventPath)!.eventType = 'birthday';
await assert.rejects(service.setAdminInvitationPageDefaultTheme('design-test', 'romantic'), /청첩장/);
assert.equal(writes.length, 0);
seed(); beforeTransaction = () => { records.delete(eventPath); };
await assert.rejects(service.setAdminInvitationPageDefaultTheme('design-test', 'romantic'), /찾을 수/);
assert.equal(records.has(eventPath), false, '삭제된 이벤트를 다시 만들지 않아야 합니다.');
seed(); failWrite = true;
await assert.rejects(service.setAdminInvitationPageDefaultTheme('design-test', 'romantic'), /network unavailable/);
assert.equal(records.get(eventPath)?.defaultTheme, 'simple');
assert.equal(records.get(eventPath)?.published, false);
failWrite = false;
await service.setAdminInvitationPageDefaultTheme('design-test', 'romantic');
assert.equal(records.get(eventPath)?.defaultTheme, 'romantic');
assert.equal(records.get(eventPath)?.published, false, '실패 후 재시도해도 기존 비공개 상태를 유지해야 합니다.');
console.log('Admin default theme metadata isolation and authorization checks passed');

type Element = { type: unknown; props: Record<string, unknown> };
async function testDesignSelectionRecovery() {
  const slots: unknown[] = []; let cursor = 0; let tree: unknown;
  let saveCount = 0; let refreshCount = 0;
  let finishSave: (() => void) | undefined;
  let rejectSave: ((error: Error) => void) | undefined;
  let refreshFails = false;
  const react = {
    useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value: unknown) => { slots[index] = value; }]; },
    useRef(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
  };
  const props = {
    page: { slug: 'design-test', displayName: '테스트', defaultTheme: 'simple' },
    canEdit: true, routes: { preview: (_slug: string, theme: string) => `/design-test/${theme}` },
    onUpdated: async () => {
      refreshCount++;
      if (refreshFails) throw new Error('refresh failed');
      props.page = { ...props.page, defaultTheme: 'romantic' };
    },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(ts.transpileModule(readFileSync('src/app/admin/_components/AdminEventDesignTab.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console, require(id: string) {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx: (type: unknown, value: Record<string, unknown>) => ({ type, props: value }), jsxs: (type: unknown, value: Record<string, unknown>) => ({ type, props: value }) };
    if (id.endsWith('.module.css')) return { default: {} };
    if (id === './AdminWorkGuard') return { useAdminWorkGuard: () => {} };
    if (id === '@/services/invitationPageService') return { setAdminInvitationPageDefaultTheme: async (slug: string, theme: string) => {
      saveCount++; assert.equal(slug, 'design-test'); assert.equal(theme, 'romantic');
      await new Promise<void>((resolve, reject) => { finishSave = resolve; rejectSave = reject; });
    } };
    if (id === '@/app/_components/public-invitations/wedding/WeddingCover') return { default: 'cover' };
    if (id.startsWith('@/')) return load(path.resolve('src', id.slice(2)));
    if (id.startsWith('.')) return load(path.resolve('src/app/admin/_components', id));
    return nativeRequire(id);
  } });
  const render = () => { cursor = 0; tree = (exports.default as (value: unknown) => unknown)(props); };
  function nodes(value: unknown): Element[] {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object' || !('props' in value)) return [];
    const element = value as Element;
    return [element, ...Object.values(element.props).flatMap(nodes)];
  }
  const find = (predicate: (node: Element) => boolean) => nodes(tree).find(predicate);
  const button = () => find((node) => node.type === 'button' && node.props['aria-label'] === '포토형 기본 주소에 사용')!;
  render();
  const click = button().props.onClick as () => Promise<void>;
  const first = click(); const duplicate = click();
  assert.equal(saveCount, 1, '화면이 다시 그려지기 전 연속 클릭도 한 번만 저장해야 합니다.');
  const otherDesign = find((node) => node.type === 'button' && node.props['aria-label'] === '내추럴형 기본 주소에 사용');
  assert.ok(otherDesign);
  await (otherDesign.props.onClick as () => Promise<void>)();
  assert.equal(saveCount, 1, '다른 디자인의 빠른 연속 클릭도 진행 중인 저장을 중복 실행하지 않아야 합니다.');
  render(); assert.equal(button().props.disabled, true);
  rejectSave!(new Error('save failed')); await Promise.all([first, duplicate]); render();
  assert.ok(find((node) => node.props.role === 'alert'), '실패 시 재시도할 수 있는 오류를 보여야 합니다.');
  assert.equal(props.page.defaultTheme, 'simple');
  assert.equal(button().props.disabled, false);
  refreshFails = true;
  const retry = (button().props.onClick as () => Promise<void>)();
  finishSave!(); await retry; render();
  assert.equal(saveCount, 2); assert.equal(refreshCount, 1);
  assert.ok(find((node) => node.props.role === 'alert'), '저장 후 목록 확인에 실패해도 성공으로 단정하지 않아야 합니다.');
  const refresh = find((node) => node.type === 'button' && node.props.children === '최신 설정 확인');
  assert.ok(refresh);
  refreshFails = false;
  await (refresh.props.onClick as () => Promise<void>)(); render();
  assert.equal(saveCount, 2, '확인 재시도는 기본 디자인을 중복 저장하지 않아야 합니다.');
  assert.equal(props.page.defaultTheme, 'romantic');
  assert.equal(find((node) => node.props.role === 'alert'), undefined);
  assert.ok(find((node) => node.props.role === 'status' && typeof node.props.children === 'string' && node.props.children.includes('적용했습니다')));
  props.canEdit = false; render();
  assert.equal(find((node) => node.type === 'button'), undefined, '조회 전용 화면에는 디자인 저장을 제공하지 않아야 합니다.');
}
await testDesignSelectionRecovery();
console.log('Admin default design duplicate click, save failure and refresh recovery checks passed');
