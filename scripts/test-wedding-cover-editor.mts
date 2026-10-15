import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';

Object.assign(globalThis, { React });
register(new URL('./test-css-module-loader.mjs', import.meta.url), import.meta.url);

const { default: ImagesStep } = await import('../src/app/page-wizard/steps/ImagesStep.tsx');
const noop = () => {};
const config = createInitialWizardConfig('wedding');
config.metadata.images.wedding = '/images/cover.jpg';
let writes = 0;
const props: React.ComponentProps<typeof ImagesStep> = {
  formState: config, previewFormState: config, updateForm: () => { writes += 1; },
  isAdminLoggedIn: true, canUploadImages: true, maxGalleryImages: 18, uploadingField: null,
  coverUploadInputRef: React.createRef(), sharePreviewUploadInputRef: React.createRef(),
  kakaoCardUploadInputRef: React.createRef(), galleryUploadInputRef: React.createRef(),
  onTriggerPicker: noop, onCoverUpload: noop, onSharePreviewUpload: noop,
  onKakaoCardUpload: noop, onGalleryUpload: noop, onCoverImageRemove: noop,
  onSharePreviewImageRemove: noop, onKakaoCardImageRemove: noop,
  onGalleryImageRemove: noop, onGalleryImageMove: noop, mode: 'photos',
};
const render = (overrides: Partial<React.ComponentProps<typeof ImagesStep>> = {}) =>
  renderToStaticMarkup(React.createElement(ImagesStep, { ...props, ...overrides }));

assert.match(render(), /aria-label="표지 배치"/,
  'Administrators need cover composition controls in the photo step');
assert.doesNotMatch(render({ isAdminLoggedIn: false }), /aria-label="표지 배치"/,
  'A customer cannot change administrator cover composition');
assert.doesNotMatch(render({ isAdminLoggedIn: false, experience: true }), /aria-label="표지 배치"/,
  'Experience mode alone must not grant administrator controls');
assert.match(render({ isAdminLoggedIn: true, experience: true }), /aria-label="표지 배치"/,
  'An administrator experience retains the same editor controls');
assert.doesNotMatch(render({ mode: 'sharing' }), /aria-label="표지 배치"/,
  'Sharing image settings do not expose the invitation cover editor');
const birthday = createInitialWizardConfig('first-birthday');
assert.doesNotMatch(render({ formState: birthday, previewFormState: birthday }), /aria-label="표지 배치"/,
  'Wedding cover settings do not leak into other event types');
assert.equal(writes, 0, 'Rendering a cover editor never changes saved fields');

const { default: WeddingCoverSettings } = await import('../src/app/page-wizard/steps/WeddingCoverSettings.tsx');
const savedSettings = { focusX: 28, focusY: 67, textPosition: 'top' as const };
const renderSettings = (hasImage: boolean, isImageBroken = false) => renderToStaticMarkup(
  React.createElement(WeddingCoverSettings, {
    settings: savedSettings, hasImage, isImageBroken, onChange: noop, onPreviewFocus: noop,
  }),
);
const active = renderSettings(true);
const activeRanges = active.match(/<input[^>]+type="range"[^>]*>/g) ?? [];
assert.equal(activeRanges.length, 2, 'The editor exposes horizontal and vertical focus');
assert.match(activeRanges[0], /value="28"/);
assert.match(activeRanges[1], /value="67"/);
for (const range of activeRanges) {
  assert.match(range, /min="0"/);
  assert.match(range, /max="100"/);
  assert.doesNotMatch(range, /disabled/);
}
for (const html of [renderSettings(false), renderSettings(true, true)]) {
  const ranges = html.match(/<input[^>]+type="range"[^>]*>/g) ?? [];
  assert.equal(ranges.length, 2);
  assert.ok(ranges.every(range => range.includes('disabled=""')),
    'Missing or failed photos cannot change focus');
  assert.match(html, /<option value="top" selected="">/,
    'Photo failure retains the selected text placement');
  assert.doesNotMatch(html.match(/<select[^>]*>/)?.[0] ?? '', /disabled/,
    'Text placement remains editable without a photo');
}
const noPhoto = structuredClone(config);
noPhoto.metadata.images.wedding = '';
const noPhotoWithPreviewExample = render({ formState: noPhoto, previewFormState: config });
assert.ok((noPhotoWithPreviewExample.match(/<input[^>]+type="range"[^>]*>/g) ?? [])
  .every(range => range.includes('disabled=""')),
  'A preview-only example photo must not enable focus controls on an empty draft');

// Exercise the production handlers with only React's generated ID controlled.
const coverModule = await import('../src/lib/weddingCover.ts');
const componentExports: Record<string, unknown> = {};
const dependencies: Record<string, unknown> = {
  react: { useId: () => 'cover-editor' },
  'react/jsx-runtime': jsxRuntime,
  '@/lib/weddingCover': coverModule,
  './WeddingCoverSettings.module.css': { default: {} },
};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/app/page-wizard/steps/WeddingCoverSettings.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, {
  exports: componentExports,
  require(name: string) {
    assert.ok(name in dependencies, `Unexpected component dependency: ${name}`);
    return dependencies[name];
  },
});
interface TestElement {
  type: unknown;
  props: {
    children?: unknown;
    type?: string;
    onChange?: (event: { currentTarget: { value: string } }) => void;
    onClick?: () => void;
    onFocusCapture?: () => void;
    onPointerDownCapture?: () => void;
  };
}
function elements(node: unknown): TestElement[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  const element = node as TestElement;
  return [element, ...elements(element.props?.children)];
}
const ControlledEditor = componentExports.default as (props: React.ComponentProps<typeof WeddingCoverSettings>) => TestElement;
let nextSettings: React.ComponentProps<typeof WeddingCoverSettings>['settings'] = savedSettings;
let changes = 0;
let previewFocuses = 0;
const renderControls = (hasImage = true, isImageBroken = false) => ControlledEditor({
  settings: nextSettings, hasImage, isImageBroken,
  onChange(next) { changes += 1; nextSettings = { ...next }; },
  onPreviewFocus() { previewFocuses += 1; },
});
let tree = renderControls();
tree.props.onFocusCapture?.();
tree.props.onPointerDownCapture?.();
assert.equal(previewFocuses, 2, 'Keyboard and pointer use both request the live cover preview');
let ranges = elements(tree).filter(node => node.type === 'input' && node.props.type === 'range');
ranges[0].props.onChange?.({ currentTarget: { value: '82' } });
assert.deepEqual(nextSettings, { focusX: 82, focusY: 67, textPosition: 'top' });
tree = renderControls();
ranges = elements(tree).filter(node => node.type === 'input' && node.props.type === 'range');
ranges[1].props.onChange?.({ currentTarget: { value: '19' } });
assert.deepEqual(nextSettings, { focusX: 82, focusY: 19, textPosition: 'top' });
tree = renderControls();
elements(tree).find(node => node.type === 'select')!.props.onChange?.({ currentTarget: { value: 'bottom' } });
assert.deepEqual(nextSettings, { focusX: 82, focusY: 19, textPosition: 'bottom' },
  'Text placement changes preserve both focus axes');
tree = renderControls();
elements(tree).find(node => node.type === 'button' && node.props.children === '초점 중앙으로')!.props.onClick?.();
assert.deepEqual(nextSettings, { focusX: 50, focusY: 50, textPosition: 'bottom' },
  'Centering resets only focus and preserves text placement');
const beforeDisabledChanges = changes;
for (const unavailable of [renderControls(false), renderControls(true, true)]) {
  for (const range of elements(unavailable).filter(node => node.type === 'input')) {
    range.props.onChange?.({ currentTarget: { value: '0' } });
  }
  elements(unavailable).find(node => node.type === 'button' && node.props.children === '초점 중앙으로')!.props.onClick?.();
}
assert.equal(changes, beforeDisabledChanges, 'Stale input handlers cannot change focus without a usable photo');

const { applyWizardLibraryImageSelection } = await import('../src/app/page-wizard/wizardImageLibrarySelection.ts');
config.pageData!.weddingCover = { focusX: 82, focusY: 19, textPosition: 'bottom' };
applyWizardLibraryImageSelection(config, 'cover', '/images/new-cover.jpg', 18);
assert.deepEqual(config.pageData!.weddingCover, { focusX: 82, focusY: 19, textPosition: 'bottom' },
  'Selecting another uploaded photo preserves its saved cover composition');

console.log('Wedding cover editor roles, image states and input behavior checks passed');
