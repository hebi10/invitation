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

// Real provider callbacks must preserve A on a rejected B and ignore stale B after C wins.
{
  let cursor = 0;
  let value: { session: { pageSlug: string } | null; loginWithLinkToken: (token: string, options?: { signal: AbortSignal }) => Promise<boolean>; isAuthenticating: boolean; authError: string | null };
  const slots: unknown[] = [];
  const writes: string[] = [];
  const finish: Record<string, { resolve: (result: unknown) => void; reject: (error: Error) => void }> = {};
  const timers = new Set<() => void>();
  let failStorage = false;
  let failCardCache = false;
  let persistedSlug: string | null = null;
  const delayedStorage = new Set<string>();
  const finishStorage: Record<string, () => void> = {};
  const exports: Record<string, unknown> = {};
  runInNewContext(authSource, { exports, AbortController,
    setTimeout: (callback: () => void) => { timers.add(callback); return callback; },
    clearTimeout: (callback: () => void) => timers.delete(callback),
    require(id: string) {
      if (id === 'react') return {
        createContext: () => ({ Provider: 'provider' }),
        useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
          return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
        useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
        useCallback: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(), useEffect() {},
      };
      if (id === 'react/jsx-runtime') { const element = (_type: unknown, props: { value?: typeof value }) => { if (props.value) value = props.value; return props; }; return { jsx: element, jsxs: element }; }
      if (id === './PreferencesContext') return { usePreferences: () => ({ apiBaseUrl: 'https://example.test', isReady: true }) };
      if (id === '../lib/api') return { exchangeMobileClientEditorLinkToken: (_base: string, token: string) => new Promise((resolve, reject) => { finish[token] = { resolve, reject }; }) };
      if (id === '../lib/storage') return { setStoredJson: async (_key: string, session: { pageSlug: string } | null) => {
        if (failStorage) throw new Error('Keychain write failed');
        if (session && delayedStorage.has(session.pageSlug)) {
          await new Promise<void>(resolve => { finishStorage[session.pageSlug] = resolve; });
        }
        persistedSlug = session?.pageSlug ?? null;
        if (session) writes.push(session.pageSlug);
      } };
      if (id === '../lib/linkedInvitationCards') return {
        buildLinkedInvitationCardFromPageSummary: (page: unknown) => page,
        upsertLinkedInvitationCard: async () => { if (failCardCache) throw new Error('Recent card cache unavailable'); },
      };
      return {};
    },
  });
  function render() { cursor = 0; (exports.AuthProvider as (props: object) => unknown)({}); }
  const response = (slug: string) => ({ session: { pageSlug: slug, token: slug, expiresAt: Date.now() + 600000 }, page: null, links: {} });
  render();
  const initial = value!.loginWithLinkToken('a'); finish.a.resolve(response('a')); assert.equal(await initial, true); render();
  const failed = value!.loginWithLinkToken('invalid-b'); finish['invalid-b'].reject(new Error('만료된 링크입니다.'));
  assert.equal(await failed, false); render(); assert.equal(value!.session?.pageSlug, 'a', 'A remains available after B is rejected');
  const stale = value!.loginWithLinkToken('b');
  const latest = value!.loginWithLinkToken('c'); finish.c.resolve(response('c')); assert.equal(await latest, true);
  finish.b.resolve(response('b')); assert.equal(await stale, false, 'An outdated exchange must not apply its session');
  render(); assert.equal(value!.session?.pageSlug, 'c'); assert.deepEqual(writes, ['a', 'c']);
  const controller = new AbortController();
  const cancelled = value!.loginWithLinkToken('cancelled', { signal: controller.signal }); controller.abort();
  finish.cancelled.resolve(response('cancelled')); assert.equal(await cancelled, false);
  render(); assert.equal(value!.session?.pageSlug, 'c');
  const timedOut = value!.loginWithLinkToken('timeout');
  for (const callback of timers) callback();
  assert.equal(await timedOut, false, 'A stalled exchange must settle so the user can retry');
  render(); assert.equal(value!.session?.pageSlug, 'c'); assert.equal(value!.isAuthenticating, false);
  assert.match(value!.authError ?? '', /시간/);
  finish.timeout.resolve(response('timeout')); await new Promise(resolve => setImmediate(resolve));
  render(); assert.equal(value!.session?.pageSlug, 'c', 'A late timeout response cannot replace the working session');

  failStorage = true;
  const storageFailure = value!.loginWithLinkToken('storage-failure');
  finish['storage-failure'].resolve(response('storage-failure'));
  assert.equal(await storageFailure, false);
  render();
  assert.equal(value!.session?.pageSlug, 'c', 'A valid exchange whose secure persistence fails must preserve the existing active session');
  assert.deepEqual(writes, ['a', 'c'], 'A failed secure write must not replace the stored working session');

  failStorage = false;
  failCardCache = true;
  const cardFailure = value!.loginWithLinkToken('card-failure');
  finish['card-failure'].resolve({ ...response('card-failure'), page: { slug: 'card-failure', ticketCount: 0 } });
  assert.equal(await cardFailure, true, 'A recent-card cache failure must not report a successfully persisted connection as failed');
  render();
  assert.equal(value!.session?.pageSlug, 'card-failure');
  assert.equal(value!.authError, null);
  assert.equal(writes.at(-1), 'card-failure');

  failCardCache = false;
  delayedStorage.add('aborted-during-storage');
  const abortedDuringStorage = new AbortController();
  const interruptedDuringStorage = value!.loginWithLinkToken('aborted-during-storage', { signal: abortedDuringStorage.signal });
  finish['aborted-during-storage'].resolve(response('aborted-during-storage'));
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(finishStorage['aborted-during-storage'], 'The secure write must really be pending when cancellation arrives');
  abortedDuringStorage.abort();
  finishStorage['aborted-during-storage']();
  assert.equal(await interruptedDuringStorage, false);
  render(); assert.equal(value!.session?.pageSlug, 'card-failure');
  assert.equal(persistedSlug, 'card-failure', 'Cancellation during secure storage must restore the previous persisted session too');

  delayedStorage.add('superseded-during-storage');
  delayedStorage.add('newest-after-storage');
  const supersededDuringStorage = value!.loginWithLinkToken('superseded-during-storage');
  finish['superseded-during-storage'].resolve(response('superseded-during-storage'));
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(finishStorage['superseded-during-storage']);
  const newestAfterStorage = value!.loginWithLinkToken('newest-after-storage');
  finish['newest-after-storage'].resolve(response('newest-after-storage'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finishStorage['newest-after-storage'], undefined, 'The newest write must wait for the older write and its rollback');
  finishStorage['superseded-during-storage']();
  assert.equal(await supersededDuringStorage, false);
  assert.equal(persistedSlug, 'card-failure', 'The old write must roll back before the queued newest write completes');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(finishStorage['newest-after-storage']);
  finishStorage['newest-after-storage']();
  assert.equal(await newestAfterStorage, true);
  render(); assert.equal(value!.session?.pageSlug, 'newest-after-storage');
  assert.equal(persistedSlug, 'newest-after-storage', 'An older write cannot finish last and replace the newest persisted session');
}
console.log('mobile authentication transient-error recovery checks passed');
