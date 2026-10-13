import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

import * as mediaAssets from '../src/lib/mediaAssets';

type Element = { type: unknown; props: Record<string, unknown> };
type Handler = (event?: { target: { value: string } }) => unknown;

// 외부 저장소만 대체하고 컴포넌트의 실제 이벤트·상태 전이를 실행합니다.
function componentHarness(file: string, props: Record<string, unknown>, modules: Record<string, unknown>) {
  const slots: Array<{ value?: unknown; deps?: unknown[] }> = [];
  let cursor = 0;
  let changed = true;
  let tree: unknown;
  const effects: Array<() => unknown> = [];
  const overlay = { confirm: async () => true, showToast: () => {} };
  const sameDeps = (left?: unknown[], right?: unknown[]) => Boolean(left && right && left.length === right.length && left.every((item, index) => Object.is(item, right[index])));
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, (value: unknown) => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; changed = true; }
      }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: { current: initial } };
      return slots[index].value;
    },
    useMemo(factory: () => unknown, deps: unknown[]) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback(callback: unknown, deps: unknown[]) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { value: callback, deps };
      return slots[index].value;
    },
    useEffect(effect: () => unknown, deps: unknown[]) {
      const index = cursor++;
      if (!sameDeps(slots[index]?.deps, deps)) { slots[index] = { deps }; effects.push(effect); }
    },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, console, Date, window: {},
    require: (name: string) => {
      if (name.endsWith('.module.css')) return { default: {} };
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type: unknown, props: Record<string, unknown>) => ({ type, props }), jsxs: (type: unknown, props: Record<string, unknown>) => ({ type, props }) };
      if (name === '@/contexts') return { useAdmin: () => ({ isAdminLoggedIn: true }) };
      if (name === '@/app/admin/_components/AdminWorkGuard') return { useAdminWorkGuard: () => {} };
      if (name === '@/app/admin/_components') return { EmptyState: 'EmptyState', FilterToolbar: 'FilterToolbar', StatusBadge: 'StatusBadge', useAdminOverlay: () => overlay };
      return modules[name] ?? {};
    },
  });
  const render = exports.default as (props: Record<string, unknown>) => unknown;
  function nodes(value: unknown): Element[] {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [];
    const element = value as Element;
    if (!element.props) return [];
    return [element, ...Object.values(element.props).flatMap(nodes)];
  }
  return {
    async flush() {
      for (let pass = 0; pass < 20; pass++) {
        if (changed) { changed = false; cursor = 0; tree = render(props); }
        for (const effect of effects.splice(0)) effect();
        await new Promise<void>((resolve) => setImmediate(resolve));
        if (!changed && effects.length === 0) return;
      }
      throw new Error('Component state did not settle');
    },
    find(type: string, predicate: (props: Record<string, unknown>) => boolean = () => true) {
      return nodes(tree).find((element) => element.type === type && predicate(element.props));
    },
  };
}

async function testExplicitImageRefreshBypassesCache() {
  let fileNames = ['first.webp'];
  let listingCount = 0;
  const exports: Record<string, unknown> = {};
  const storage = {
    ref: (_storage: unknown, fullPath: string) => ({ fullPath }),
    listAll: async () => { listingCount++; return { items: fileNames.map((name) => ({ name, fullPath: `wedding-images/page-a/${name}` })), prefixes: [] }; },
    getDownloadURL: async (file: { fullPath: string }) => `https://images.test/${file.fullPath}`,
    getMetadata: async () => ({ timeCreated: '2026-10-12T00:00:00Z', customMetadata: { variant: 'content' } }),
  };
  runInNewContext(ts.transpileModule(readFileSync('src/services/imageService.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, console, Date, window: {}, setTimeout: () => 0,
    process: { env: { NEXT_PUBLIC_USE_FIREBASE: 'true' } },
    require: (name: string) => name === 'firebase/storage' ? storage : name === '@/lib/firebase' ? { storage: {} } : name === '@/lib/mediaAssets' ? mediaAssets : {},
  });
  const list = exports.getImagesByPage as (slug: string, options?: { forceRefresh?: boolean; allowListing?: boolean }) => Promise<Array<{ name: string }>>;
  assert.equal((await list('page-a')).length, 1);
  fileNames = ['first.webp', 'added-elsewhere.webp'];
  assert.equal((await list('page-a')).length, 1, 'Ordinary lookup should retain the cache');
  assert.equal(listingCount, 1);
  assert.equal((await list('page-a', { forceRefresh: true })).length, 2, 'Explicit refresh must read changes made outside this manager');
  assert.equal(listingCount, 2);
  assert.equal((await list('page-a', { forceRefresh: true, allowListing: false })).length, 0, 'Refresh must preserve the listing permission boundary');

  for (const lockedPageSlug of [undefined, 'page-a']) {
    const requestedOptions: Array<{ forceRefresh?: boolean } | undefined> = [];
    const imageManager = componentHarness('src/components/admin/ImageManager/ImageManager.tsx', { lockedPageSlug }, {
      '@/lib/mediaAssets': mediaAssets,
      '@/services/invitationPageService': { getAllManagedInvitationPages: async () => [{ slug: 'page-a', displayName: 'A', eventType: 'wedding' }] },
      '@/services/imageService': {
        getImagesByPage: async (_slug: string, options: { forceRefresh?: boolean }) => { requestedOptions.push(options); return []; },
        getAllPageImages: async (options: { forceRefresh?: boolean }) => { requestedOptions.push(options); return { 'page-a': [] }; },
        getPageMediaUsageReferences: async () => [],
      },
    });
    await imageManager.flush();
    assert.equal(requestedOptions[0]?.forceRefresh, undefined, 'Initial manager load must retain caching');
    const refresh = imageManager.find('button', (props) => props.children === '새로고침');
    assert.ok(refresh);
    (refresh.props.onClick as Handler)();
    await imageManager.flush();
    assert.equal(requestedOptions.at(-1)?.forceRefresh, true, 'Both event-specific and global refresh controls must bypass the image cache');
  }
}

async function testMemoryRemovalPreservesOriginalUntilAndAfterSave() {
  const image = { id: 'memory-one', name: 'memory.webp', url: '/memory.webp', thumbnailUrl: '/thumb-memory.webp', path: 'memory-images/page-a/memory.webp', thumbnailPath: 'memory-images/page-a/thumb-memory.webp', source: 'memory', category: 'ceremony', caption: '', order: 0 };
  const files = new Set([image.path, image.thumbnailPath]);
  let storedPage = {
    pageSlug: 'page-a', enabled: true, visibility: 'public', title: '추억', subtitle: '', introMessage: '', thankYouMessage: '',
    heroImage: image as typeof image | null, heroImageCrop: { focusX: 50, focusY: 50, zoom: 1 }, heroThumbnailUrl: image.thumbnailUrl,
    weddingDate: '', venueName: '', venueAddress: '', groomName: '', brideName: '', galleryImages: [image], selectedComments: [], timelineItems: [],
    seoTitle: '', seoDescription: '', seoNoIndex: false, createdAt: new Date(), updatedAt: new Date(),
  };
  const component = componentHarness('src/components/admin/MemoryPageManager/MemoryPageManager.tsx', { initialPageSlug: 'page-a', lockedPageSlug: 'page-a' }, {
    '@/services/invitationPageService': { getAllManagedInvitationPages: async () => [{ slug: 'page-a', displayName: 'A' }] },
    '@/services/commentService': { getAllComments: async () => [] },
    '@/services/memoryPageService': {
      buildMemoryPageUrl: (slug: string) => `/memory/${slug}/`, backfillSelectedComments: (comments: unknown) => comments,
      getMemoryPageByPageSlug: async () => structuredClone(storedPage),
      deleteMemoryImageAsset: async () => { files.delete(image.path); files.delete(image.thumbnailPath); },
      saveMemoryPage: async (page: typeof storedPage) => { storedPage = structuredClone(page); return structuredClone(storedPage); },
    },
  });
  await component.flush();
  const remove = component.find('button', (props) => typeof props.children === 'string' && props.children.includes('제거'));
  assert.ok(remove, 'The gallery removal control must be available');
  (remove.props.onClick as Handler)();
  await component.flush();
  assert.equal(component.find('img', (props) => props.alt === 'memory.webp'), undefined, 'Removal must update the editable gallery');
  assert.equal(storedPage.galleryImages.length, 1, 'Removal must remain a draft change until saved');
  assert.equal(files.size, 2, 'Draft removal must not delete files still referenced by the saved public page');
  const save = component.find('button', (props) => props.children === '변경사항 저장');
  assert.ok(save);
  (save.props.onClick as Handler)();
  await component.flush();
  assert.equal(storedPage.galleryImages.length, 0, 'Saving must persist the gallery removal');
  assert.equal(storedPage.heroImage, null, 'Removing the hero must update its persisted reference');
  assert.equal(files.size, 2, 'Saving a removed gallery entry must not trigger automatic original cleanup');
}

async function testPeriodFiltersKeepUnsavedEditorAccessible() {
  const pages = ['a', 'b'].map((id) => ({ slug: `page-${id}`, displayName: id.toUpperCase(), eventType: 'wedding', venue: '', published: true, displayPeriodStart: null, displayPeriodEnd: null }));
  const periods = [{ pageSlug: 'page-a', startDate: new Date('2099-01-01'), endDate: new Date('2099-01-10'), isActive: true }];
  let savedEndDate = '';
  const component = componentHarness('src/components/admin/DisplayPeriodManager/DisplayPeriodManager.tsx', { isVisible: true, initialPageSlug: 'page-a' }, {
    '@/services/invitationPageService': { getAllManagedInvitationPages: async () => pages },
    '@/services/displayPeriodService': { getAllDisplayPeriods: async () => periods, setDisplayPeriod: async (_slug: string, _start: Date, end: Date) => { savedEndDate = end.toISOString(); } },
    '@/app/admin/_components/adminPageUtils': { DUE_SOON_DAYS: 7, getPeriodStatusMeta: () => ({ label: '시작 전', tone: 'neutral', description: '' }) },
  });
  await component.flush();
  const endInput = component.find('input', (props) => props.type === 'date' && props.value === '2099-01-10');
  assert.ok(endInput);
  (endInput.props.onChange as Handler)({ target: { value: '2099-01-11' } });
  await component.flush();
  const search = component.find('input', (props) => props.type === 'search');
  assert.ok(search);
  (search.props.onChange as Handler)({ target: { value: 'page-b' } });
  await component.flush();
  assert.ok(component.find('form'), 'Search must not hide an unsaved period editor');
  const status = component.find('select');
  assert.ok(status);
  (status.props.onChange as Handler)({ target: { value: 'inactive' } });
  await component.flush();
  assert.ok(component.find('form'), 'Status filters must keep the pending save and cancel controls accessible');
  const save = component.find('button', (props) => props.type === 'submit');
  assert.ok(save);
  const form = component.find('form');
  assert.ok(form);
  await (form.props.onSubmit as Handler)();
  await component.flush();
  assert.match(savedEndDate, /^2099-01-11/);
  assert.equal(component.find('form'), undefined, 'Saved editing cards should return to normal filtering');
}

const cases = { cache: testExplicitImageRefreshBypassesCache, memory: testMemoryRemovalPreservesOriginalUntilAndAfterSave, period: testPeriodFiltersKeepUnsavedEditorAccessible };
const selectedCase = process.argv[2] as keyof typeof cases | undefined;
if (selectedCase) await cases[selectedCase]();
else for (const test of Object.values(cases)) await test();
console.log('Admin image refresh, original preservation and filtered editor recovery checks passed');
