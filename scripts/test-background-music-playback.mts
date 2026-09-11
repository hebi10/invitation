import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the real component handlers with a controllable audio element.
const source = ts.transpileModule(readFileSync(new URL('../src/components/media/BackgroundMusic.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function mount(autoPlay = true, overrides: Record<string, unknown> = {}) {
  const document = new EventTarget();
  const effects: Array<() => void> = [];
  const states: unknown[] = [];
  let stateIndex = 0;
  let attempts = 0;
  let blocked = true;
  let loads = 0;
  const audio = { paused: true, volume: 0, error: null as object | null, load() { loads++; this.error = null; }, pause() { this.paused = true; }, async play() {
    attempts += 1;
    if (blocked) throw new Error('Playback blocked');
    this.paused = false;
  } };
  let firstRef = true;
  const exports: Record<string, (props: object) => unknown> = {};
  const jsx = (type: string, props: object) => ({ type, props });
  runInNewContext(source, {
    exports, document,
    window: { scrollY: 0, addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout },
    console: { error() {} },
    require(id: string) {
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'react') return {
        useState: (initial: unknown) => {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value: unknown) => { states[index] = value; }];
        },
        useRef: (initial: unknown) => { const current = firstRef ? audio : initial; firstRef = false; return { current }; },
        useCallback: (callback: unknown) => callback,
        useEffect: (effect: () => void) => effects.push(effect),
      };
      if (id.includes('musicLibrary')) return { DEFAULT_INVITATION_MUSIC_VOLUME: 0.35, clampInvitationMusicVolume: (value: number) => value };
      return { default: {} };
    },
  });
  const render = () => {
    stateIndex = 0;
    firstRef = true;
    return exports.default({ musicUrl: '/sample.mp3', autoPlay, ...overrides }) as {
      props: { children: Array<{ type: string; props: { ref: { current: unknown }; onClick: () => Promise<void>; onError: () => void; children: unknown; 'aria-label': string } }> };
    };
  };
  const tree = render();
  const control = tree.props.children.find((child) => child?.type === 'button')!;
  effects.forEach((effect) => effect());
  return { audio, document, control, tree, render, unblock: () => { blocked = false; }, attempts: () => attempts, loads: () => loads };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const player = mount();
player.document.dispatchEvent(new Event('click'));
await flush();
assert.equal(player.attempts(), 1);
player.unblock();
player.document.dispatchEvent(new Event('click'));
await flush();
assert.equal(player.audio.paused, false, 'A second gesture retries after browser playback rejection');
player.document.dispatchEvent(new Event('keydown'));
await flush();
assert.equal(player.attempts(), 2, 'Successful autoplay does not restart on later gestures');
const disabled = mount(false);
disabled.unblock();
disabled.document.dispatchEvent(new Event('click'));
await flush();
assert.equal(disabled.attempts(), 0, 'Disabled autoplay waits for its own control');
const manual = mount();
manual.unblock();
manual.control.props.ref.current = { contains: (target: unknown) => target === manual.document };
manual.document.dispatchEvent(new Event('touchstart'));
await flush();
assert.equal(manual.attempts(), 0, 'Touching the music control does not also trigger page autoplay');
await manual.control.props.onClick();
assert.equal(manual.attempts(), 1, 'Its click handler starts playback once');
manual.control.props.ref.current = null;
manual.audio.pause();
manual.document.dispatchEvent(new Event('keydown'));
await flush();
assert.equal(manual.audio.paused, true, 'Manual playback is not restarted by other page interactions');

const recovery = mount(false);
assert.equal(recovery.control.props['aria-label'], '음악 켜기');
recovery.audio.error = { code: 2 };
recovery.tree.props.children.find(child => child?.type === 'audio')!.props.onError();
const failedTree = recovery.render();
assert.ok(failedTree.props.children.some(child => child?.type === 'p' && String(child.props.children).includes('불러오지 못했어요')), 'A failed audio request has a visible explanation');
const retry = failedTree.props.children.find(child => child?.type === 'button')!;
assert.equal(retry.props['aria-label'], '음악 다시 시도');
const initialLoads = recovery.loads();
recovery.unblock();
await retry.props.onClick();
assert.equal(recovery.loads(), initialLoads + 1, 'Explicit retry reloads the failed media resource');
assert.equal(recovery.audio.paused, false);
const playingTree = recovery.render();
const stop = playingTree.props.children.find(child => child?.type === 'button')!;
assert.equal(stop.props['aria-label'], '음악 끄기');
assert.ok(!playingTree.props.children.some(child => child?.type === 'p'), 'Successful retry clears the error');
await stop.props.onClick();
assert.equal(recovery.audio.paused, true);
let lookupRetries = 0;
const missingUrl = mount(false, { musicUrl: '', loadError: true, onRetryLoad: () => lookupRetries++ });
assert.equal(missingUrl.control.props['aria-label'], '음악 다시 시도');
await missingUrl.control.props.onClick();
assert.equal(lookupRetries, 1, 'Storage URL lookup failures can be retried before an audio source exists');
console.log('Background music playback checks passed');
