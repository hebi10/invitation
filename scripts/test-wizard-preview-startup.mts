import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { createInitialWizardConfig } from '../src/app/page-wizard/pageWizardData.ts';
import * as previewSections from '../src/app/wizard-preview/previewSections.ts';
import * as weddingIntro from '../src/lib/weddingIntro.ts';

type Element = { type: unknown; key: unknown; props: Record<string, unknown> & { children?: unknown } };
type Message = { type: string; formState?: unknown; theme?: string; step?: string };
type FrameWindow = { postMessage: (message: Message, origin: string) => void };
type Effect = { deps: unknown[]; cleanup?: () => void };
const origin = 'https://invitation.test';
function elements(node: unknown): Element[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  const element = node as Element;
  return [element, ...elements(element.props?.children)];
}
function text(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return Array.isArray(node) ? node.map(text).join('') : text((node as Element).props?.children);
}

// Control only hook scheduling and browser boundaries. All message, timer,
// iframe-load and retry callbacks below are the production component's code.
function createPreview() {
  const hooks: unknown[] = [];
  const effects: Effect[] = [];
  let hookIndex = 0;
  let pendingEffects: Array<() => void> = [];
  let dirty = false;
  let tree: unknown;
  let frame: Element;
  let currentWindow: FrameWindow;
  const messages: Array<{ message: Message; source: FrameWindow }> = [];
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const timers = new Map<number, { at: number; callback: () => void }>();
  let timerId = 0;
  let now = 0;
  let props: Record<string, unknown> = { formState: createInitialWizardConfig('wedding'), theme: 'simple' };
  const equal = (before: unknown[] | undefined, next: unknown[]) => before?.length === next.length && next.every((value, index) => Object.is(value, before[index]));
  const exports: { default?: (props: Record<string, unknown>) => unknown } = {};
  runInNewContext(ts.transpileModule(readFileSync('src/app/page-wizard/WeddingWizardPreview.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, window: {
    location: { origin },
    addEventListener(name: string, callback: (event: unknown) => void) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(callback);
    },
    removeEventListener(name: string, callback: (event: unknown) => void) { listeners.get(name)?.delete(callback); },
    setTimeout(callback: () => void, delay: number) { timers.set(++timerId, { callback, at: now + delay }); return timerId; },
    clearTimeout(id: number) { timers.delete(id); },
  }, require(name: string) {
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === 'react') return {
      useState(initial: unknown) {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = initial;
        return [hooks[index], (next: unknown) => {
          const value = typeof next === 'function' ? next(hooks[index]) : next;
          if (!Object.is(hooks[index], value)) { hooks[index] = value; dirty = true; }
        }];
      },
      useRef(initial: unknown) { const index = hookIndex++; return hooks[index] ?? (hooks[index] = { current: initial }); },
      useCallback(callback: unknown, deps: unknown[]) {
        const index = hookIndex++;
        const previous = hooks[index] as { callback: unknown; deps: unknown[] } | undefined;
        if (!equal(previous?.deps, deps)) hooks[index] = { callback, deps };
        return (hooks[index] as { callback: unknown }).callback;
      },
      useEffect(effect: () => void | (() => void), deps: unknown[]) {
        const index = hookIndex++;
        if (equal(effects[index]?.deps, deps)) return;
        pendingEffects.push(() => {
          effects[index]?.cleanup?.();
          effects[index] = { deps, cleanup: effect() || undefined };
        });
      },
    };
    if (name === '@/lib/invitationThemes') return { getInvitationThemeLabel: (theme: string) => theme };
    if (name === '@/lib/eventPreviewLinks') return { getWeddingPreviewThemeKeys: () => ['simple', 'emotional'], isWeddingPreviewThemeKey: () => true };
    if (name === '@/lib/weddingIntro') return weddingIntro;
    if (name === '../wizard-preview/previewSections') return previewSections;
    if (name.endsWith('.module.css')) return { default: {} };
    throw new Error(`Unexpected preview dependency: ${name}`);
  } });

  const render = () => {
    dirty = false;
    hookIndex = 0;
    tree = exports.default!(props);
    const nextFrame = elements(tree).find(element => element.type === 'iframe')!;
    if (!frame || nextFrame.key !== frame.key) {
      currentWindow = { postMessage(message, target) {
        assert.equal(target, origin, 'Draft messages must stay within the same origin');
        messages.push({ message, source: this });
      } };
    }
    frame = nextFrame;
    (frame.props.ref as { current: unknown }).current = { contentWindow: currentWindow };
  };
  const flush = () => {
    for (let count = 0; count < 20; count += 1) {
      if (dirty) render();
      const pending = pendingEffects;
      pendingEffects = [];
      pending.forEach(effect => effect());
      if (!dirty && pendingEffects.length === 0) return;
    }
    throw new Error('Preview failed to settle');
  };
  render();
  return {
    flush,
    get frame() { return frame; },
    get currentWindow() { return currentWindow; },
    get props() { return props; },
    get messages() { return messages; },
    get status() { return text(elements(tree).find(element => element.props?.role === 'status')); },
    get positionDisabled() { return elements(tree).find(element => element.type === 'button')!.props.disabled; },
    get canRetry() { return elements(tree).some(element => element.type === 'button' && text(element) === '다시 불러오기'); },
    get timerCount() { return timers.size; },
    update(next: Record<string, unknown>) { props = { ...props, ...next }; render(); flush(); },
    load() { (frame.props.onLoad as () => void)(); flush(); },
    receive(type: string, source = currentWindow, messageOrigin = origin) {
      listeners.get('message')?.forEach(listener => listener({ data: { type }, source, origin: messageOrigin }));
      flush();
    },
    focusCover() {
      listeners.get('wizard-preview-focus')?.forEach(listener => listener({ detail: { step: 'images', target: 'cover' } }));
      flush();
    },
    advance(milliseconds: number) {
      const until = now + milliseconds;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        flush();
      }
      now = until;
    },
    retry() {
      const retry = elements(tree).find(element => element.type === 'button' && text(element) === '다시 불러오기');
      assert.ok(retry, 'A delayed startup must expose an explicit retry');
      (retry.props.onClick as () => void)();
      flush();
    },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}

test('Editing cover settings keeps the preview on the cover without replaying the intro', () => {
  const preview = createPreview();
  preview.flush();
  preview.update({ activeStepKey: 'images' });
  preview.receive('wedding-wizard-preview:rendered');
  preview.focusCover();
  assert.equal(preview.messages.at(-1)?.message.type, 'wedding-wizard-preview:section');
  assert.equal(preview.messages.at(-1)?.message.step, 'cover');
  preview.update({ formState: { ...(preview.props.formState as object), pageData: { weddingCover: { focusX: 17, focusY: 80, textPosition: 'top' } } } });
  const lastSection = preview.messages.filter(entry => entry.message.type === 'wedding-wizard-preview:section').at(-1);
  assert.equal(lastSection?.message.step, 'cover', 'Draft updates must not jump back to the gallery');
  assert.ok(!preview.messages.some(entry => entry.message.type === 'wedding-wizard-preview:top'), 'Cover adjustment must not replay the intro');
  preview.unmount();
});

test('Child readiness does not finish startup until a draft has actually rendered', () => {
  const preview = createPreview();
  preview.flush();
  preview.receive('wedding-wizard-preview:ready');
  assert.equal(preview.positionDisabled, true, 'A ready document without a rendered draft must remain loading');
  assert.equal(preview.timerCount, 1, 'The startup watchdog must survive the ready handshake');
  preview.receive('wedding-wizard-preview:rendered');
  assert.equal(preview.positionDisabled, false);
  assert.equal(preview.timerCount, 0);
  const frameKey = preview.frame.key;
  preview.advance(60000);
  assert.equal(preview.frame.key, frameKey, 'A successfully rendered preview must never reload automatically');
  preview.unmount();
});

test('A silent first frame retries once, then waits for an explicit retry without losing draft changes', () => {
  const preview = createPreview();
  preview.flush();
  const firstWindow = preview.currentWindow;
  const firstKey = preview.frame.key;
  preview.advance(15000);
  assert.notEqual(preview.frame.key, firstKey, 'The first stalled frame must be recreated automatically');
  assert.doesNotMatch(preview.status, /불러오지 못했습니다/);
  const retryKey = preview.frame.key;
  preview.advance(60000);
  assert.equal(preview.frame.key, retryKey, 'Automatic retries must stop after one replacement');
  assert.match(preview.status, /불러오지 못했습니다/);
  preview.receive('wedding-wizard-preview:rendered', firstWindow);
  preview.receive('wedding-wizard-preview:rendered', preview.currentWindow, 'https://untrusted.test');
  assert.equal(preview.positionDisabled, true, 'Old frames and foreign origins cannot complete the current preview');
  const draft = createInitialWizardConfig('wedding');
  draft.couple.groom.name = '저장 전 이름';
  const before = JSON.stringify(draft);
  preview.update({ formState: draft, theme: 'emotional' });
  preview.retry();
  assert.notEqual(preview.frame.key, retryKey);
  preview.load();
  const update = preview.messages.filter(({ message }) => message.type === 'wedding-wizard-preview:update').at(-1)!.message;
  assert.equal(update.formState, draft, 'Reload sends the current unsaved draft');
  assert.equal(update.theme, 'emotional');
  assert.equal(JSON.stringify(draft), before, 'Recovery must never mutate the input draft');
  const manualKey = preview.frame.key;
  preview.advance(60000);
  assert.equal(preview.frame.key, manualKey, 'Manual retries must not restart an automatic retry loop');
  assert.match(preview.status, /불러오지 못했습니다/);
  preview.retry();
  preview.receive('wedding-wizard-preview:rendered');
  assert.equal(preview.positionDisabled, false);
  assert.doesNotMatch(preview.status, /불러오지 못했습니다/);
  preview.unmount();
});

test('Early ready and iframe load callbacks replay the latest draft and restore the editing section', () => {
  const preview = createPreview();
  // Simulate the cached child's ready message arriving before parent effects.
  preview.receive('wedding-wizard-preview:ready');
  preview.load();
  preview.flush();
  assert.ok(preview.messages.some(({ message }) => message.type === 'wedding-wizard-preview:update'));
  preview.update({ activeStepKey: 'images' });
  preview.receive('wedding-wizard-preview:rendered');
  assert.equal(preview.messages.at(-1)!.message.type, 'wedding-wizard-preview:section');
  assert.equal(preview.messages.at(-1)!.message.step, 'images');
  preview.unmount();
});

test('Automatic recovery completes the replacement frame handshake with the latest unsaved draft', () => {
  const preview = createPreview();
  preview.flush();
  preview.load(); // A blank HTTP 200 document loads but never announces ready.
  const firstWindow = preview.currentWindow;
  const draft = createInitialWizardConfig('wedding');
  draft.couple.groom.name = '자동 복구 중 수정한 이름';
  preview.advance(10000);
  preview.update({ formState: draft, theme: 'emotional', activeStepKey: 'images' });
  preview.advance(5000);
  assert.notEqual(preview.currentWindow, firstWindow);

  // The new document announces readiness before its load event. No manual
  // click or synthetic load is needed to resend the current input.
  preview.receive('wedding-wizard-preview:ready');
  const sent = preview.messages.at(-1)!;
  assert.equal(sent.source, preview.currentWindow);
  assert.equal(sent.message.type, 'wedding-wizard-preview:update');
  assert.equal(sent.message.formState, draft);
  assert.equal(sent.message.theme, 'emotional');
  assert.equal(preview.positionDisabled, true);
  assert.equal(preview.timerCount, 1);

  preview.receive('wedding-wizard-preview:rendered');
  assert.equal(preview.positionDisabled, false);
  assert.equal(preview.canRetry, false);
  assert.equal(preview.timerCount, 0);
  assert.equal(preview.messages.at(-1)!.message.step, 'images');
  const recoveredWindow = preview.currentWindow;
  preview.advance(60000);
  assert.equal(preview.currentWindow, recoveredWindow);
  preview.unmount();
});

test('A slow automatic attempt can finish after its timeout without another reload', () => {
  const preview = createPreview();
  preview.flush();
  preview.advance(30000);
  assert.match(preview.status, /불러오지 못했습니다/);
  const pendingWindow = preview.currentWindow;
  preview.receive('wedding-wizard-preview:ready');
  assert.equal(preview.messages.at(-1)!.source, pendingWindow);
  assert.equal(preview.positionDisabled, true);
  preview.receive('wedding-wizard-preview:rendered');
  assert.equal(preview.currentWindow, pendingWindow);
  assert.equal(preview.positionDisabled, false);
  assert.equal(preview.canRetry, false);
  assert.doesNotMatch(preview.status, /불러오지 못했습니다/);
  preview.unmount();
});

test('The first timeout exposes manual recovery while the single automatic retry is still loading', () => {
  const preview = createPreview();
  preview.flush();
  preview.advance(14999);
  assert.equal(preview.canRetry, false);
  preview.advance(1);
  assert.equal(preview.canRetry, true, 'Automatic recovery must not delay the existing 15-second manual recovery');
  assert.doesNotMatch(preview.status, /불러오지 못했습니다/, 'An active automatic attempt must still report a loading state');
  const automaticKey = preview.frame.key;
  preview.retry();
  const manualKey = preview.frame.key;
  assert.notEqual(manualKey, automaticKey, 'The user can replace the pending frame immediately');
  assert.equal(preview.positionDisabled, true);
  preview.advance(60000);
  assert.equal(preview.frame.key, manualKey, 'Manual recovery must not reset the automatic retry budget');
  assert.match(preview.status, /불러오지 못했습니다/);
  preview.receive('wedding-wizard-preview:rendered');
  assert.equal(preview.canRetry, false, 'The retry action disappears once the draft renders');
  assert.equal(preview.positionDisabled, false);
  preview.unmount();
});

test('An automatic reload preserves temporary intro preview without changing the saved intro style', () => {
  const preview = createPreview();
  const draft = createInitialWizardConfig('wedding');
  draft.introStyle = 'none';
  preview.update({ formState: draft, introPreview: { style: 'envelope' } });
  const firstKey = preview.frame.key;
  preview.advance(15000);
  assert.notEqual(preview.frame.key, firstKey);
  preview.load();
  preview.receive('wedding-wizard-preview:rendered');
  const update = preview.messages.filter(({ message }) => message.type === 'wedding-wizard-preview:update').at(-1)!.message;
  assert.equal((update.formState as { introStyle: string }).introStyle, 'envelope');
  assert.equal(draft.introStyle, 'none');
  assert.equal(preview.messages.at(-1)!.message.type, 'wedding-wizard-preview:top');
  assert.match(preview.status, /저장되지 않습니다/);
  preview.unmount();
});

test('Leaving the editor cancels recovery for a pending frame', () => {
  const preview = createPreview();
  preview.flush();
  assert.equal(preview.timerCount, 1);
  const key = preview.frame.key;
  preview.unmount();
  assert.equal(preview.timerCount, 0);
  preview.advance(60000);
  assert.equal(preview.frame.key, key);
});
