import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as uploadState from '../src/app/page-wizard/wizardImageUploadState.ts';
import type { useImageUpload } from '../src/app/page-wizard/hooks/useImageUpload.ts';
import type { useWizardPersistence } from '../src/app/page-wizard/hooks/useWizardPersistence.ts';
import { createWizardMutationGuard, uploadImageBatch } from '../src/app/page-wizard/wizardImageUploadState.ts';

const guard = createWizardMutationGuard();
const releaseUpload = guard.tryStart();
assert.ok(releaseUpload);
assert.equal(guard.tryStart(), null, 'Saving or a second upload must not start while uploading');
releaseUpload();
const releaseSave = guard.tryStart();
assert.ok(releaseSave, 'Saving becomes available after uploading');
releaseUpload();
assert.equal(guard.tryStart(), null, 'An old completion cannot unlock a newer operation');
releaseSave();

const applied: string[] = [];
const attempted: string[] = [];
const result = await uploadImageBatch(['first', 'broken', 'last'], async file => {
  attempted.push(file);
  if (file === 'broken') throw new Error('network');
  return `${file}-url`;
}, url => applied.push(url));
assert.deepEqual(attempted, ['first', 'broken', 'last']);
assert.deepEqual(applied, ['first-url', 'last-url'], 'A later failure must preserve earlier success');
assert.equal(result.succeeded, 2);
assert.deepEqual(result.failed, ['broken']);

const transpile = (path: string) => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const hookExports = {} as { useImageUpload: typeof useImageUpload };
const hookGuard = createWizardMutationGuard();
let finishUpload!: () => void;
let uploadStarted!: () => void;
const started = new Promise<void>(resolve => { uploadStarted = resolve; });
const pending = new Promise<void>(resolve => { finishUpload = resolve; });
const form = { pageData: { galleryImages: [] as string[] } };
const notices: string[] = [];
runInNewContext(transpile('src/app/page-wizard/hooks/useImageUpload.ts'), { exports: hookExports, require(name: string) {
  if (name === 'react') return { useCallback: (callback: unknown) => callback };
  if (name.endsWith('/wizardImageUploadState')) return uploadState;
  if (name.endsWith('/imageService')) return {
    validateEditableImageBatch: () => null,
    getEditableImageUploadHint: () => '',
    uploadEditablePageImage: async (file: { name: string }) => {
      if (file.name === 'first') { uploadStarted(); await pending; }
      if (file.name === 'broken') throw new Error('network');
      return { url: file.name + '-url' };
    },
  };
  return {};
} });
const hook = hookExports.useImageUpload({
  canUploadImages: true, uploadRole: 'owner', formState: form, maxGalleryImages: 10,
  ensureDraftCreated: async () => ({ slug: 'sample', createdFresh: false }),
  updateForm: (apply: (draft: typeof form) => void) => apply(form),
  setUploadingField: () => {}, showNotice: (_tone: string, text: string) => notices.push(text), showErrorNotice: (error: unknown) => { throw error; }, mutationGuard: hookGuard,
} as unknown as Parameters<typeof useImageUpload>[0]);
const running = hook.handleGalleryUpload({ target: { files: [{ name: 'first' }, { name: 'broken' }, { name: 'last' }], value: '' } } as unknown as Parameters<typeof hook.handleGalleryUpload>[0]);
await started;

const persistenceExports = {} as { useWizardPersistence: typeof useWizardPersistence };
runInNewContext(transpile('src/app/page-wizard/hooks/useWizardPersistence.ts'), { exports: persistenceExports, require(name: string) {
  if (name === 'react') return { useCallback: (callback: unknown) => callback, useRef: (value: unknown) => ({ current: value }) };
  return {};
} });
const persistence = persistenceExports.useWizardPersistence({
  formState: form, mutationGuard: hookGuard, showNotice: (_tone: string, text: string) => notices.push(text),
} as unknown as Parameters<typeof useWizardPersistence>[0]);
assert.equal(await persistence.persistDraft(), null, 'Actual save hook blocks before making any request during upload');
assert.match(notices.at(-1) ?? '', /업로드가 끝난 뒤/);
finishUpload();
await running;
assert.deepEqual(form.pageData.galleryImages, ['first-url', 'last-url']);
assert.match(notices.at(-1) ?? '', /2장은 추가했고 1장/);
assert.match(notices.at(-1) ?? '', /broken/);
assert.ok(hookGuard.tryStart(), 'Actual upload completion must release the shared guard');
console.log('wizard image upload state tests passed');
