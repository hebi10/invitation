import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the real component handlers with a controllable audio element.
const source = ts.transpileModule(readFileSync(new URL('../src/components/media/BackgroundMusic.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function mount(autoPlay = true) {
  const document = new EventTarget();
  const effects: Array<() => void> = [];
  let attempts = 0;
  let blocked = true;
  const audio = { paused: true, volume: 0, load() {}, pause() { this.paused = true; }, async play() {
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
        useState: (initial: unknown) => [initial, () => {}],
        useRef: (initial: unknown) => { const current = firstRef ? audio : initial; firstRef = false; return { current }; },
        useCallback: (callback: unknown) => callback,
        useEffect: (effect: () => void) => effects.push(effect),
      };
      if (id.includes('musicLibrary')) return { DEFAULT_INVITATION_MUSIC_VOLUME: 0.35, clampInvitationMusicVolume: (value: number) => value };
      return { default: {} };
    },
  });
  const tree = exports.default({ musicUrl: '/sample.mp3', autoPlay }) as {
    props: { children: Array<{ type: string; props: { ref: { current: unknown }; onClick: () => Promise<void> } }> };
  };
  const control = tree.props.children.find((child) => child?.type === 'button')!;
  effects.forEach((effect) => effect());
  return { audio, document, control, unblock: () => { blocked = false; }, attempts: () => attempts };
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
console.log('Background music playback checks passed');
