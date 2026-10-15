import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function loadModule<Module = Record<string, unknown>>(file: string, dependencies: Record<string, unknown> = {}, globals = {}): Module {
  const exports: Record<string, unknown> = {};
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, console: { warn() {}, error() {} }, setTimeout: (callback: () => void) => { callback(); return 0; },
    require(name: string) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    }, ...globals,
  });
  return exports as Module;
}

function imageService(failure?: { code: string } | Error, initialized = true) {
  const storage = {
    ref: (_storage: unknown, fullPath: string) => ({ fullPath }),
    listAll: async ({ fullPath }: { fullPath: string }) => {
      if (failure) throw failure;
      return { items: [], prefixes: fullPath === 'wedding-images' ? [{ name: 'example' }] : [] };
    },
  };
  return loadModule<{ getImagesByPage: (slug: string) => Promise<unknown[]>; getAllPageImages: () => Promise<unknown> }>('src/services/imageService.ts', {
    '@/lib/imageUploadPolicy': {}, '@/services/adminAuth': {}, '@/utils/imageCompression': {},
    '@/lib/mediaAssets': loadModule('src/lib/mediaAssets.ts'),
    'firebase/storage': storage, '@/lib/firebase': { storage: initialized ? {} : null },
  }, { window: {}, process: { env: { NEXT_PUBLIC_USE_FIREBASE: 'true' } } });
}

test('Storage permission and network failures reject instead of looking like an empty page', async () => {
  for (const failure of [{ code: 'storage/unauthorized' }, new Error('offline')]) {
    await assert.rejects(() => imageService(failure).getImagesByPage('example'));
    await assert.rejects(() => imageService(failure).getAllPageImages());
  }
  assert.equal((await imageService().getImagesByPage('example')).length, 0);
  await assert.rejects(() => imageService(undefined, false).getImagesByPage('example'));
});

test('Legacy wizard fallback never clears saved selections or restores intentionally removed photos', async () => {
  let listingCalls = 0;
  const fallback = loadModule<{ applyWizardStorageImageFallback: <Config>(config: Config) => Promise<Config> }>('src/app/page-wizard/pageWizardImageFallback.ts', {
    '@/services/imageService': { getPageImages: async () => { listingCalls += 1; return []; } },
  });
  for (const images of [
    { wedding: 'https://images.test/wedding-images/example/cover.webp', social: 'saved-social', kakaoCard: 'saved-kakao' },
    { wedding: '', social: '', kakaoCard: '' },
  ]) {
    const saved = { slug: 'example', config: { metadata: { images }, pageData: { galleryImages: images.wedding ? [images.wedding] : [] } } };
    assert.equal(await fallback.applyWizardStorageImageFallback(saved), saved);
  }
  assert.equal(listingCalls, 0, 'Opening saved content must not reconcile it against Storage');
});

test('Explicit library selection changes only its target and preserves gallery order, duplicates and limit', () => {
  const helperFile = 'src/app/page-wizard/wizardImageLibrarySelection.ts';
  assert.ok(existsSync(helperFile), 'Existing Storage photos need an explicit draft selection operation');
  const draft = { metadata: { images: { wedding: 'old-cover', social: 'old-social', kakaoCard: 'old-kakao' } }, pageData: { galleryImages: ['first', 'second', 'first'] } };
  const { applyWizardLibraryImageSelection: select } = loadModule<{ applyWizardLibraryImageSelection: (draft: typeof draft, kind: string, url: string, limit: number) => void }>(helperFile);
  select(draft, 'cover', 'chosen-cover', 5);
  select(draft, 'sharePreview', 'chosen-social', 5);
  select(draft, 'kakaoCard', 'chosen-kakao', 5);
  assert.deepEqual(draft.metadata.images, { wedding: 'chosen-cover', social: 'chosen-social', kakaoCard: 'chosen-kakao' });
  assert.deepEqual(draft.pageData.galleryImages, ['first', 'second', 'first']);
  select(draft, 'gallery', 'first', 5);
  assert.deepEqual(draft.pageData.galleryImages, ['first', 'second', 'first'], 'Do not introduce another copy or deduplicate saved entries');
  select(draft, 'gallery', 'new', 4);
  assert.deepEqual([...draft.pageData.galleryImages], ['first', 'second', 'first', 'new']);
  select(draft, 'gallery', 'overflow', 4);
  select(draft, 'cover', '   ', 4);
  assert.deepEqual([...draft.pageData.galleryImages], ['first', 'second', 'first', 'new']);
  assert.equal(draft.metadata.images.wedding, 'chosen-cover');
});

// Exercise the actual component handlers; only React's hook storage and the external listing are controlled.
function componentHarness(dependencies: Record<string, unknown>, file = 'src/app/page-wizard/steps/ExistingImagePicker.tsx') {
  const state: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  let stateIndex = 0;
  let refIndex = 0;
  const hooks = {
    useState(initial: unknown) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (next: unknown) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useRef(initial: unknown) {
      const index = refIndex++;
      return refs[index] ?? (refs[index] = { current: initial });
    },
    useEffect() {}, useId: () => 'library', useMemo: (read: () => unknown) => read(),
  };
  assert.ok(existsSync(file), 'The editor must let an administrator pick an uploaded photo');
  const { default: Component } = loadModule<{ default: (props: Record<string, unknown>) => unknown }>(file, {
    react: hooks, 'react/jsx-runtime': jsxRuntime,
    '../page.module.css': { default: {} }, './ImagesStep.module.css': { default: {} },
    ...dependencies,
  });
  return (props: Record<string, unknown>) => {
    stateIndex = 0; refIndex = 0;
    return Component(props);
  };
}

interface TestElement {
  type: unknown;
  props: { children?: unknown; onClick: () => void | Promise<void>; onSelect: (url: string) => void; onLibrarySelect: (url: string) => void; [name: string]: unknown };
}

function elements(node: unknown): TestElement[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  const element = node as TestElement;
  return [element, ...elements(element.props?.children)];
}

test('Opening, retrying and closing the library never selects or saves a photo', async () => {
  let calls = 0;
  const selections: string[] = [];
  const render = componentHarness({ '@/services/imageService': { getImagesByPage: async (slug: string, options: { forceRefresh: boolean }) => {
    assert.equal(slug, 'example'); assert.equal(options.forceRefresh, true);
    calls += 1;
    if (calls === 1) throw new Error('offline');
    return [{ name: 'saved.webp', url: 'saved-url', path: 'wedding-images/example/saved.webp' }];
  } } });
  const props = { pageSlug: 'example', title: '대표 이미지', selectedUrls: [], disabled: false, onSelect: (url: string) => selections.push(url) };
  let tree = render(props);
  assert.equal(calls, 0, 'Rendering the editor must not list Storage automatically');
  await elements(tree).find(node => node.type === 'button')!.props.onClick();
  tree = render(props);
  assert.ok(elements(tree).some(node => node.props?.role === 'alert'), 'An error must not become an empty library');
  assert.deepEqual(selections, []);
  await elements(tree).find(node => node.type === 'button' && node.props.children === '다시 불러오기')!.props.onClick();
  tree = render(props);
  assert.deepEqual(selections, []);
  const choose = elements(tree).find(node => node.type === 'button' && String(node.props['aria-label']).includes('saved.webp'));
  assert.ok(choose, 'Loaded assets must be selectable');
  choose.props.onClick();
  assert.deepEqual(selections, ['saved-url']);
  tree = render({ ...props, disabled: true });
  assert.equal(elements(tree).find(node => node.type === 'button' && String(node.props['aria-label']).includes('saved.webp'))!.props.disabled, true);
  elements(tree).find(node => node.type === 'button' && String(node.props['aria-label']).includes('saved.webp'))!.props.onClick();
  assert.deepEqual(selections, ['saved-url'], 'A stale click cannot change the draft while the picker is disabled');
  tree = render(props);
  await elements(tree).find(node => node.type === 'button')!.props.onClick();
  tree = render(props);
  assert.equal(elements(tree).find(node => node.type === 'button')!.props['aria-expanded'], false);
  assert.deepEqual(selections, ['saved-url'], 'Closing the library must not change a selection');
});

test('Editor library controls route each explicit selection to its own draft field', () => {
  const Picker = () => null;
  const helper = loadModule('src/app/page-wizard/wizardImageLibrarySelection.ts');
  const render = componentHarness({
    '../wizardImageLibrarySelection': helper,
    './DemoExperienceImagePicker': { default: () => null },
    './ExistingImagePicker': { default: Picker },
    './ShareImagePreview.module.css': { default: {} },
  }, 'src/app/page-wizard/steps/ImagesStep.tsx');
  const draft = { eventType: 'wedding', metadata: { images: { wedding: '', social: '', kakaoCard: '' } }, pageData: { galleryImages: ['saved'] } };
  let writes = 0;
  const props = { formState: draft, previewFormState: draft, canUploadImages: true, maxGalleryImages: 3, uploadingField: null,
    updateForm: (apply: (draft: typeof draft) => void) => { writes += 1; apply(draft); },
  };
  const customer = render(props);
  assert.ok(elements(customer).filter(node => typeof node.type === 'function').every(node => !node.props.imageLibraryPageSlug && node.type !== Picker), 'Customers must not receive the admin library');
  const admin = render({ ...props, imageLibraryPageSlug: 'example' });
  assert.equal(writes, 0, 'Merely rendering an administrator editor cannot update photos');
  for (const [kind, url] of [['cover', 'cover-url'], ['sharePreview', 'social-url'], ['kakaoCard', 'kakao-url']]) {
    const card = elements(admin).find(node => node.props?.uploadKind === kind);
    assert.ok(card, `${kind} needs the library callback`);
    assert.equal(card.props.imageLibraryPageSlug, 'example');
    card.props.onLibrarySelect(url);
  }
  const gallery = elements(admin).find(node => node.type === Picker);
  assert.ok(gallery);
  gallery.props.onSelect('gallery-url');
  assert.deepEqual(draft.metadata.images, { wedding: 'cover-url', social: 'social-url', kakaoCard: 'kakao-url' });
  assert.deepEqual([...draft.pageData.galleryImages], ['saved', 'gallery-url']);
  assert.equal(writes, 4, 'Only explicit picks reach the draft updater');
});
