import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function compile(file: string) {
  return ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
}
const errors: Record<string, unknown> = {};
runInNewContext(compile('apps/mobile/src/lib/apiErrors.ts'), { exports: errors });
const core: Record<string, unknown> = {};
runInNewContext(compile('apps/mobile/src/lib/apiCore.ts'), { exports: core, process: { env: {} }, require: (id: string) =>
  id === './apiErrors' ? errors : id === 'expo-constants' ? { default: {} } : {} });
const readResponse = core.readJsonResponse as (response: object) => Promise<unknown>;
const authSource = compile('apps/mobile/src/contexts/AuthContext.tsx');

async function restore(error: unknown, failStorage = false) {
  let cursor = 0;
  let value: { isReady: boolean };
  const slots: unknown[] = [];
  const effects: (() => void)[] = [];
  const removed: string[] = [];
  const exports: Record<string, unknown> = {};
  runInNewContext(authSource, { exports, require(id: string) {
    if (id === 'react') return {
      createContext: () => ({ Provider: 'provider' }),
      useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
        return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
      useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
      useCallback: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(), useEffect: (fn: () => void) => effects.push(fn),
    };
    if (id === 'react/jsx-runtime') return { jsx: () => null, jsxs: (_type: unknown, props: { value?: typeof value }) => { if (props.value) value = props.value; return props; } };
    if (id === './PreferencesContext') return { usePreferences: () => ({ apiBaseUrl: 'https://example.test', isReady: true }) };
    if (id === '../lib/apiErrors') return errors;
    if (id === '../lib/api') return { validateMobileClientEditorSession: async () => { throw error; }, refreshMobileCustomerAuth: async () => { throw error; } };
    if (id === '../lib/storage') return {
      getStoredJson: async (key: string) => {
        if (failStorage) throw new Error('Keychain unavailable');
        return key.endsWith(':session') ? { pageSlug: 'page', token: 'editor', expiresAt: Date.now() + 600000 }
          : { uid: 'customer', idToken: 'expired', refreshToken: 'refresh', expiresAt: Date.now() - 1 };
      },
      setStoredString: async (key: string, next: string | null) => { if (next === null) removed.push(key); }, setStoredJson: async () => {},
    };
    return {};
  } });
  function render() { cursor = 0; (exports.AuthProvider as (props: object) => unknown)({}); }
  render();
  for (const effect of effects.splice(0)) effect();
  await new Promise(resolve => setImmediate(resolve));
  render();
  return { removed, isReady: value!.isReady };
}

for (const status of [429, 500, 503, 401, 403]) {
  let error: unknown;
  try { await readResponse({ ok: false, status, json: async () => ({ error: 'Unauthorized.' }) }); } catch (caught) { error = caught; }
  const result = await restore(error);
  assert.equal(result.isReady, true);
  assert.equal(result.removed.length, status === 401 || status === 403 ? 2 : 0,
    `HTTP ${status}: only a definitive authentication rejection may remove persistent credentials`);
}
assert.deepEqual((await restore(new TypeError('Failed to fetch'))).removed, []);
assert.equal((await restore(new Error('unused'), true)).isReady, true, 'Secure storage failure must leave the boot loading screen');
console.log('mobile authentication transient-error recovery checks passed');
