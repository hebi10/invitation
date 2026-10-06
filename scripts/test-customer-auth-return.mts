import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { buildConnectReturnTo } from '../src/lib/customerAuthReturn';

type Element = { type: string | ((props: Record<string, unknown>) => unknown); props: Record<string, unknown> };
type Slot = { value?: unknown; deps?: unknown[] };
const connectReturn = '/connect/wedding-example#token=recovery-token_123';
const recoveryPath = '/forgot-password#returnTo=%2Fconnect%2Fwedding-example%23token%3Drecovery-token_123';
const loginPath = '/login#returnTo=%2Fconnect%2Fwedding-example%23token%3Drecovery-token_123';

// Execute the real components and effects, replacing only browser/React scheduling
// and authentication boundaries. No account, email, storage, or network is used.
function mount(file: string, props: Record<string, unknown>, path = '/login', loggedIn = false, emailVerified = true) {
  const slots: Slot[] = [];
  let cursor = 0;
  let changed = false;
  let effects: Array<() => void> = [];
  let elements: Element[] = [];
  let text: string[] = [];
  const redirects: string[] = [];
  const location = new URL(path, 'https://invitation.test');
  const auth = { authUser: { uid: 'test-customer', emailVerified }, isLoggedIn: loggedIn, isAdminLoading: false };
  const router = { replace: (target: string) => redirects.push(target) };
  const unexpectedExternalCall = () => { throw new Error('Authentication/email calls are forbidden in navigation tests'); };
  const modules = new Map<string, Record<string, unknown>>();
  const react = {
    Suspense: ({ children }: { children: unknown }) => children,
    useState(initial: unknown) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, (value: unknown) => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(slots[index].value, next)) changed = true;
        slots[index].value = next;
      }];
    },
    useEffect(effect: () => void, deps: unknown[]) {
      const index = cursor++;
      if (!slots[index]?.deps || deps.some((dep, position) => !Object.is(dep, slots[index].deps?.[position]))) {
        slots[index] = { deps };
        effects.push(effect);
      }
    },
  };

  function load(sourceFile: string) {
    if (modules.has(sourceFile)) return modules.get(sourceFile)!;
    const exports: Record<string, unknown> = {};
    modules.set(sourceFile, exports);
    const code = ts.transpileModule(readFileSync(sourceFile, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    runInNewContext(code, { exports, URL, URLSearchParams, window: { location }, require(id: string) {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type: Element['type'], props: Element['props']) => ({ type, props }), jsxs: (type: Element['type'], props: Element['props']) => ({ type, props }) };
      if (id === 'next/link') return { __esModule: true, default: ({ children, ...linkProps }: Element['props']) => ({ type: 'a', props: { ...linkProps, children } }) };
      if (id === 'next/navigation') return { useRouter: () => router, useSearchParams: () => location.searchParams };
      if (id === '@/contexts') return { useAdmin: () => ({ ...auth, login: unexpectedExternalCall, register: unexpectedExternalCall, loginWithGoogle: unexpectedExternalCall, refreshSession: unexpectedExternalCall, sendVerificationEmail: unexpectedExternalCall }) };
      if (id === '@/services/adminAuth') return { sendFirebasePasswordReset: unexpectedExternalCall };
      if (id === '@/app/_components/FirebaseAuthLoginCard') return load('src/app/_components/FirebaseAuthLoginCard.tsx');
      if (id === '@/app/_components/MobileAccountReturn') return { __esModule: true, default: () => null };
      if (id.startsWith('@/lib/')) return load(`src/lib/${id.slice('@/lib/'.length)}.ts`);
      if (id.endsWith('.module.css')) return { __esModule: true, default: {} };
      throw new Error(`Unexpected module: ${id}`);
    } });
    return exports;
  }

  const Component = load(file).default as (props: Record<string, unknown>) => unknown;
  function visit(value: unknown): void {
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value === 'string') { text.push(value); return; }
    if (!value || typeof value !== 'object') return;
    const element = value as Element;
    if (typeof element.type === 'function') return visit(element.type(element.props));
    elements.push(element);
    visit(element.props?.children);
  }
  function render() {
    for (let passes = 0; passes < 10; passes++) {
      changed = false;
      cursor = 0;
      effects = [];
      elements = [];
      text = [];
      visit(Component(props));
      effects.forEach((effect) => effect());
      if (!changed) return;
    }
    assert.fail('Component effects did not settle');
  }
  render();
  return {
    redirects,
    text: () => text.join(' '),
    login() { auth.isLoggedIn = true; render(); },
    href(label: string) {
      const link = elements.find((element) => element.type === 'a' && element.props.children === label);
      assert.ok(link, `Expected link: ${label}`);
      return link.props.href;
    },
  };
}

const cardFile = 'src/app/_components/FirebaseAuthLoginCard.tsx';
const forgotFile = 'src/app/forgot-password/page.tsx';
const loginFile = 'src/app/my-invitations/CustomerAuthPageClient.tsx';
const cardProps = { title: '로그인', description: '계정 확인', returnTo: connectReturn };
const loginProps = { title: '로그인', description: '계정 확인', authTitle: '로그인', authDescription: '계정 확인' };

const connectedCard = mount(cardFile, cardProps);
assert.equal(connectedCard.href('비밀번호를 잊으셨나요?'), recoveryPath,
  'Password recovery must carry the connect destination in its fragment');
const recovery = mount(forgotFile, {}, recoveryPath);
assert.equal(recovery.href('로그인으로 돌아가기'), loginPath,
  'The recovery screen must preserve the connect destination when returning to login');
assert.match(recovery.text(), /로그인하면.*청첩장.*연결/, 'Connect customers must be told how to resume linking after password recovery');
assert.match(mount(forgotFile, {}, '/forgot-password?from=mobile').text(), /앱으로 돌아가/, 'Existing mobile password recovery guidance must stay available');
const customer = mount(loginFile, loginProps, loginPath);
assert.deepEqual(customer.redirects, [], 'Logged-out customers must stay on login');
assert.equal(customer.href('비밀번호를 잊으셨나요?'), recoveryPath, 'A repeated reset must preserve the original destination');
customer.login();
assert.equal(customer.redirects.at(-1), connectReturn, 'Successful login must return to the original invitation');
const alreadyAuthenticated = mount(loginFile, loginProps, loginPath, true);
assert.deepEqual(alreadyAuthenticated.redirects, [connectReturn],
  'Already authenticated customers must wait for fragment recovery before redirecting');

for (const path of [recoveryPath, loginPath, ...customer.redirects]) {
  const url = new URL(path, 'https://invitation.test');
  assert.equal(url.origin, 'https://invitation.test');
  assert.equal(url.search, '', 'The token must never enter a query string');
  assert.ok(!url.pathname.includes('recovery-token'), 'The token must never enter a request path');
}

assert.equal(mount(cardFile, { ...cardProps, returnTo: undefined }).href('비밀번호를 잊으셨나요?'), '/forgot-password');
assert.equal(mount(forgotFile, {}).href('로그인으로 돌아가기'), '/login');
assert.deepEqual(mount(loginFile, loginProps, '/login', true).redirects, ['/my-invitations']);
assert.deepEqual(mount(loginFile, { ...loginProps, mobileReturn: true }, loginPath, true).redirects, [],
  'Mobile account return must retain its existing app return flow');
assert.deepEqual(mount(loginFile, { ...loginProps, initialMode: 'register' }, '/signup', true, false).redirects, [],
  'Unverified registration must keep waiting for email verification');
assert.deepEqual(mount(loginFile, { ...loginProps, initialMode: 'register' }, '/signup', true).redirects, ['/my-invitations'],
  'Verified registration must retain its dashboard fallback');
assert.deepEqual(mount(loginFile, loginProps, loginPath, true, false).redirects, [connectReturn],
  'The connect screen must retain responsibility for verification when returning from login');
assert.equal(buildConnectReturnTo('wedding-example', 'recovery-token_123'), connectReturn);
assert.equal(buildConnectReturnTo('../admin', 'token'), null);
assert.equal(buildConnectReturnTo('sample', 'token&next=evil'), null);

const rejectedReturns = [
  'https://evil.example/connect/sample#token=token',
  '//evil.example/connect/sample#token=token',
  'javascript:alert(1)',
  '/\\evil.example/connect/sample#token=token',
  '/connect/../admin#token=token',
  '/connect/%2e%2e#token=token',
  '/connect/%252e%252e#token=token',
  '/connect/sample/extra#token=token',
  '/connect/sample%2fextra#token=token',
  '/connect/sample%5cextra#token=token',
  '/connect/sample?token=token',
  '/connect/sample?next=https://evil.example#token=token',
  '/connect/sample#token=token&returnTo=https://evil.example',
  '/connect/sample#token=token&token=another',
  '/connect/sample#token=',
  '/connect/sample#other=token',
  '/connect/sample#token=token\n',
  ' /connect/sample#token=token',
];
for (const returnTo of rejectedReturns) {
  const fragment = `#returnTo=${encodeURIComponent(returnTo)}`;
  assert.equal(mount(cardFile, { ...cardProps, returnTo }).href('비밀번호를 잊으셨나요?'), '/forgot-password', 'Invalid destinations must not leave the login card');
  assert.equal(mount(forgotFile, {}, `/forgot-password${fragment}`).href('로그인으로 돌아가기'), '/login', 'Invalid destinations must be dropped by password recovery');
  assert.deepEqual(mount(loginFile, loginProps, `/login${fragment}`, true).redirects, ['/my-invitations'], 'Invalid destinations must use the dashboard fallback');
}
for (const fragment of ['#returnTo=%ZZ', '#returnTo=%2Fconnect%2Fsample%23token%3Dok&returnTo=https%3A%2F%2Fevil.example']) {
  assert.deepEqual(mount(loginFile, loginProps, `/login${fragment}`, true).redirects, ['/my-invitations']);
}
assert.deepEqual(mount(loginFile, loginProps, '/login?returnTo=%2Fconnect%2Fsample%23token%3Dquery-token', true).redirects, ['/my-invitations'],
  'Query parameters must not be accepted as token-bearing return destinations');
console.log('Customer password recovery return checks passed (no external calls)');
