import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

type CustomerSession = {
  uid: string;
  email: string;
  displayName: string | null;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

function customer(uid: string, token: string, expired = false): CustomerSession {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: null,
    idToken: token,
    refreshToken: `refresh-${uid}`,
    expiresAt: Date.now() + (expired ? -10_000 : 600_000),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const source = ts.transpileModule(
  readFileSync('apps/mobile/src/contexts/AuthContext.tsx', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }
).outputText;

function makeHarness() {
  let cursor = 0;
  const slots: unknown[] = [];
  let context: Record<string, any> = {};
  const logins = new Map<string, ReturnType<typeof deferred<{session:CustomerSession}>>>();
  const refreshes = new Map<string, ReturnType<typeof deferred<{session:CustomerSession}>>>();
  const activations = new Map<string, ReturnType<typeof deferred<object>>>();
  const stored = new Map<string, unknown>();
  const pauseWriteFor = new Set<string>();
  const pendingWrites = new Map<string, ReturnType<typeof deferred<void>>>();
  const calls = { refresh: [] as string[], activate: [] as string[] };

  const exports: Record<string, any> = {};
  runInNewContext(source, {
    exports,
    require(id: string) {
      if (id === 'react') {
        return {
          createContext: () => ({ Provider: 'provider' }),
          useState(initial: unknown) {
            const i = cursor++;
            if (!(i in slots)) slots[i] = initial;
            return [slots[i], (next: unknown) => {
              slots[i] = typeof next === 'function'
                ? (next as (old: unknown) => unknown)(slots[i])
                : next;
            }];
          },
          useRef(initial: unknown) {
            const i = cursor++;
            return slots[i] ??= { current: initial };
          },
          useCallback: (fn: unknown) => fn,
          useMemo: (fn: () => unknown) => fn(),
          useEffect: () => {},
        };
      }
      if (id === 'react/jsx-runtime') {
        const jsx = (_type: unknown, props: {value?: Record<string, any>}) => {
          if (props.value && 'loginCustomer' in props.value) context = props.value;
          return props;
        };
        return { jsx, jsxs: jsx };
      }
      if (id === './PreferencesContext') {
        return { usePreferences: () => ({
          apiBaseUrl: 'https://example.test', isReady: true, fontScale: 1, palette: {},
        }) };
      }
      if (id === '../lib/api') {
        return {
          loginMobileCustomerAuth(_base: string, email: string) {
            const pending = deferred<{session:CustomerSession}>();
            logins.set(email, pending);
            return pending.promise;
          },
          refreshMobileCustomerAuth(_base: string, token: string) {
            calls.refresh.push(token);
            const pending = deferred<{session:CustomerSession}>();
            refreshes.set(token, pending);
            return pending.promise;
          },
          activateMobileCustomerInvitation(_base: string, _idToken: string, slug: string) {
            calls.activate.push(slug);
            const pending = deferred<object>();
            activations.set(slug, pending);
            return pending.promise;
          },
        };
      }
      if (id === '../lib/storage') {
        return {
          async setStoredJson(key: string, next: unknown) {
            const uid = (next as CustomerSession)?.uid;
            if (uid && pauseWriteFor.has(uid)) {
              const wait = deferred<void>();
              pendingWrites.set(uid, wait);
              await wait.promise;
            }
            stored.set(key, next);
          },
          async setStoredString(key: string, next: string | null) {
            if (next === null) stored.delete(key);
          },
        };
      }
      if (id === '../lib/apiErrors') {
        return { isInvalidAuthError: (error: unknown) =>
          error instanceof Error && /unauthorized/i.test(error.message) };
      }
      if (id === '../lib/linkedInvitationCards') {
        return {
          buildLinkedInvitationCardFromPageSummary: () => ({}),
          upsertLinkedInvitationCard: async () => {},
        };
      }
      return {};
    },
  });

  function render() {
    cursor = 0;
    (exports.AuthProvider as (props: object) => unknown)({ children: null });
    return context;
  }

  return { render, logins, refreshes, activations, stored, calls, pauseWriteFor, pendingWrites };
}

const key = 'mobile-invitation:customer-auth-session';
const after = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

{
  const h = makeHarness();
  const login = h.render().loginCustomer('old@example.test', 'test-password');
  const logout = h.render().logoutCustomer();
  h.logins.get('old@example.test')!.resolve({ session: customer('old', 'old-token') });
  assert.equal(await login, false, 'Late login response after logout must be rejected');
  await logout;
  assert.equal(h.render().customerSession, null);
  assert.equal(h.stored.has(key), false);
}

{
  const h = makeHarness();
  const pendingA = h.render().loginCustomer('a@example.test', 'test-password');
  const pendingB = h.render().loginCustomer('b@example.test', 'test-password');
  h.logins.get('b@example.test')!.resolve({ session: customer('b', 'b-token') });
  assert.equal(await pendingB, true);
  h.logins.get('a@example.test')!.resolve({ session: customer('a', 'a-token') });
  assert.equal(await pendingA, false, 'A superseded login must not overwrite B');
  assert.equal(h.render().customerSession?.uid, 'b');
  assert.equal((h.stored.get(key) as CustomerSession).uid, 'b');
}

{
  const h = makeHarness();
  const login = h.render().loginCustomer('a@example.test', 'test-password');
  h.logins.get('a@example.test')!.resolve({ session: customer('a', 'expired', true) });
  assert.equal(await login, true);
  const [first, second] = [h.render().getCustomerIdToken(), h.render().getCustomerIdToken()];
  assert.deepEqual(h.calls.refresh, ['refresh-a'], 'Concurrent refreshes must share one request');
  h.refreshes.get('refresh-a')!.resolve({ session: customer('a', 'fresh-token') });
  assert.deepEqual(await Promise.all([first, second]), ['fresh-token', 'fresh-token']);
  assert.equal((h.stored.get(key) as CustomerSession).idToken, 'fresh-token');
}

{
  const h = makeHarness();
  const login = h.render().loginCustomer('a@example.test', 'test-password');
  h.logins.get('a@example.test')!.resolve({ session: customer('a', 'expired', true) });
  assert.equal(await login, true);
  const pending = h.render().getCustomerIdToken();
  const logout = h.render().logoutCustomer();
  h.refreshes.get('refresh-a')!.resolve({ session: customer('a', 'resurrected') });
  assert.equal(await pending, null, 'Refresh after logout must be ignored');
  await logout;
  assert.equal(h.render().customerSession, null);
  assert.equal(h.stored.has(key), false, 'Expired credential cannot reappear after logout');
}

{
  const h = makeHarness();
  h.pauseWriteFor.add('a');
  const login = h.render().loginCustomer('a@example.test', 'test-password');
  h.logins.get('a@example.test')!.resolve({ session: customer('a', 'a-token') });
  await after();
  assert.ok(h.pendingWrites.has('a'), 'Persist must be in flight');
  const logout = h.render().logoutCustomer();
  h.pendingWrites.get('a')!.resolve();
  assert.equal(await login, false);
  await logout;
  assert.equal(h.render().customerSession, null);
  assert.equal(h.stored.has(key), false, 'Queued logout must clear slow preceding secure write');
}

{
  const h = makeHarness();
  const login = h.render().loginCustomer('a@example.test', 'test-password');
  h.logins.get('a@example.test')!.resolve({ session: customer('a', 'a-token') });
  assert.equal(await login, true);
  const activate = h.render().activateOwnedInvitation('owned-wedding');
  await after();
  assert.deepEqual(h.calls.activate, ['owned-wedding']);
  const logout = h.render().logoutCustomer();
  await logout;
  h.activations.get('owned-wedding')!.resolve({
    session: { pageSlug: 'owned-wedding', token: 'editor-token', expiresAt: Date.now() + 600000 },
    links: {},
    page: null,
  });
  assert.equal(await activate, false, 'A post-logout owner activation must never commit');
  assert.equal(h.render().session, null);
}

const accountRoute = readFileSync('src/app/api/mobile/client-editor/accounts/activate/route.ts', 'utf8');
assert.match(accountRoute, /verifyCustomerRequest\(request, \{ requireVerified: true \}\)/);
assert.match(accountRoute, /getCustomerEventOwnershipSnapshot\(customer\.uid, slug\)/);
assert.match(accountRoute, /canOpenOwnedWeddingPage\(ownership, slug\)/);
assert.match(accountRoute, /return NextResponse\.json\(\{ error: '이 계정으로 관리할 수 있는 청첩장이 아닙니다\.' \}, \{ status: 403/);
assert.match(accountRoute, /ownerUid: customer\.uid/);
assert.match(accountRoute, /issuedVia: 'account-restore'/);

const authCode = readFileSync('apps/mobile/src/contexts/AuthContext.tsx', 'utf8');
assert.match(authCode, /customerAuthRevisionRef/);
assert.match(authCode, /customerSessionCommitQueueRef/);
assert.match(authCode, /customerRefreshInFlightRef/);
assert.match(authCode, /shouldApply: isCurrent/);
console.log('Mobile stage 10 customer credential transitions, ownership and re-link safety checks passed');
