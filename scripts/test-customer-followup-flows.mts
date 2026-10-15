import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { QueryClient, QueryObserver, focusManager, type QueryObserverOptions } from '@tanstack/react-query';
import { appQueryKeys, FIFTEEN_MINUTES_MS, THIRTY_MINUTES_MS } from '../src/lib/appQuery.ts';
import * as authReturn from '../src/lib/customerAuthReturn.ts';

type Element = { type: unknown; props: Record<string, unknown> };
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

// Exercise the real component effects and click handlers; replace authentication,
// network and browser scheduling so no accounts or ownership records are changed.
function mount(file: string, modules: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const slots: unknown[] = [];
  const effects: Array<() => void> = [];
  let cursor = 0;
  let dirty = false;
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        dirty ||= !Object.is(slots[index], next);
        slots[index] = next;
      }];
    },
    useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect: () => void | (() => void), deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
      if (!previous || deps.some((value, position) => !Object.is(previous.deps[position], value))) {
        const next = { deps, cleanup: undefined as (() => void) | undefined };
        slots[index] = next;
        effects.push(() => { previous?.cleanup?.(); next.cleanup = effect() ?? undefined; });
      }
    },
  };
  const exports: { default?: (props: object) => Element } = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  runInNewContext(source, { exports, Error, console, TextEncoder, URLSearchParams, ...globals, require(id: string) {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) };
    if (id.endsWith('.module.css')) return { __esModule: true, default: {} };
    return modules[id] ?? {};
  } });
  return {
    render(props: object = {}) {
      for (let pass = 0; pass < 15; pass++) {
        cursor = 0; dirty = false;
        const tree = exports.default!(props);
        for (const effect of effects.splice(0)) effect();
        if (!dirty) return tree;
      }
      throw new Error('Effects did not settle');
    },
  };
}

function nodes(tree: unknown): Element[] {
  if (!tree || typeof tree !== 'object') return [];
  const element = tree as Element;
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function click(tree: Element, label: string) {
  const button = nodes(tree).find((node) => node.type === 'button' && node.props.children === label);
  assert.ok(button, `Expected action: ${label}`);
  assert.notEqual(button.props.disabled, true, `${label} must be available`);
  return button.props.onClick as () => void;
}

function connectFixture() {
  const props = { slug: 'our-event' };
  const calls: string[] = [];
  const destinations: string[] = [];
  const location = { hash: '#token=retained-token' };
  const auth = { authUser: { uid: 'customer-one', email: 'one@example.com', emailVerified: true } as { uid: string; email: string; emailVerified: boolean } | null,
    isLoggedIn: true, isAdminLoggedIn: false, isAdminLoading: false };
  let complete = () => {};
  let reject = (_error: Error) => {};
  let logoutFails = false;
  const router = { replace: (path: string) => destinations.push(path) };
  const screen = mount('src/app/connect/[slug]/ConnectOwnershipClient.tsx', {
    'next/navigation': { useRouter: () => router },
    '@/contexts': { useAdmin: () => ({ ...auth, logout: async () => {
      if (logoutFails) throw new Error('로그아웃 실패');
      auth.authUser = null; auth.isLoggedIn = false;
    } }) },
    '@/lib/customerAuthReturn': authReturn,
    '@/services/eventOwnershipInviteService': {
      inspectOwnershipInvite: async (slug: string, token: string) => {
        assert.equal(slug, 'our-event'); assert.equal(token, 'retained-token');
        return { status: 'valid', displayName: '우리의 행사' };
      },
      consumeCustomerOwnershipInvite: (slug: string, token: string, expectedUid: string) => {
        assert.equal(slug, 'our-event'); assert.equal(token, 'retained-token');
        assert.equal(expectedUid, auth.authUser!.uid, 'The confirmation must bind the ownership request to the displayed account');
        calls.push(auth.authUser!.uid);
        return new Promise<void>((resolve, fail) => { complete = resolve; reject = fail; });
      },
    },
  }, { window: { location, crypto: { subtle: { digest: async () => new Uint8Array([1]).buffer } } } });
  return { auth, calls, destinations, location, screen, props,
    complete: () => complete(), reject: () => reject(new Error('네트워크 연결을 확인해 주세요.')),
    failLogout: () => { logoutFails = true; },
    async ready() { for (let i = 0; i < 3; i++) { screen.render(props); await settle(); } return screen.render(props); },
  };
}

{
  const fixture = connectFixture();
  const confirmation = await fixture.ready();
  assert.deepEqual(fixture.calls, [], 'A verified customer must confirm the displayed account before the token is consumed');
  assert.match(JSON.stringify(confirmation), /one@example.com/);
  assert.match(JSON.stringify(confirmation), /우리의 행사/);
  const confirm = click(confirmation, '이 계정으로 연결');
  confirm(); confirm();
  assert.deepEqual(fixture.calls, ['customer-one'], 'Rapid repeated confirmation must send only one ownership request');
  assert.match(JSON.stringify(fixture.screen.render(fixture.props)), /연결하고 있습니다/);
  fixture.complete(); await settle();
  assert.deepEqual(fixture.destinations, ['/page-wizard/our-event']);
}

{
  const fixture = connectFixture();
  click(await fixture.ready(), '다른 계정 사용')(); await settle();
  const loggedOut = fixture.screen.render(fixture.props);
  assert.ok(nodes(loggedOut).some((node) => node.props.returnTo === '/connect/our-event#token=retained-token'),
    'Switching accounts must retain the same token in the auth recovery return path');
  assert.equal(fixture.location.hash, '#token=retained-token');
  fixture.auth.authUser = { uid: 'customer-two', email: 'two@example.com', emailVerified: true };
  fixture.auth.isLoggedIn = true;
  const changedAccount = fixture.screen.render(fixture.props);
  assert.match(JSON.stringify(changedAccount), /two@example.com/);
  assert.deepEqual(fixture.calls, [], 'The replacement account must also confirm explicitly');
  click(changedAccount, '이 계정으로 연결')();
  assert.deepEqual(fixture.calls, ['customer-two']);
  fixture.complete(); await settle();
}

{
  const fixture = connectFixture();
  click(await fixture.ready(), '이 계정으로 연결')();
  fixture.reject(); await settle();
  const failed = fixture.screen.render(fixture.props);
  assert.match(JSON.stringify(failed), /네트워크 연결/);
  click(failed, '다시 시도')();
  const retry = await fixture.ready();
  assert.deepEqual(fixture.calls, ['customer-one'], 'Retry must recheck the invitation and wait for confirmation');
  click(retry, '이 계정으로 연결')();
  assert.deepEqual(fixture.calls, ['customer-one', 'customer-one']);
  fixture.complete(); await settle();
}

{
  const fixture = connectFixture();
  fixture.failLogout();
  click(await fixture.ready(), '다른 계정 사용')(); await settle();
  const failedSwitch = fixture.screen.render(fixture.props);
  assert.match(JSON.stringify(failedSwitch), /로그아웃.*못했/);
  click(failedSwitch, '다른 계정 사용');
  assert.deepEqual(fixture.calls, []);
}

{
  const fixture = connectFixture();
  click(await fixture.ready(), '이 계정으로 연결')();
  fixture.auth.authUser = null;
  fixture.auth.isLoggedIn = false;
  fixture.screen.render(fixture.props);
  fixture.complete(); await settle();
  assert.deepEqual(fixture.destinations, [], 'An ownership response from an ended session must not redirect the new session');
}

for (const condition of ['admin', 'unverified']) {
  const fixture = connectFixture();
  if (condition === 'admin') fixture.auth.isAdminLoggedIn = true;
  else fixture.auth.authUser!.emailVerified = false;
  const tree = await fixture.ready();
  assert.equal(nodes(tree).some((node) => node.props.children === '이 계정으로 연결'), false);
  assert.deepEqual(fixture.calls, [], 'Administrator and unverified accounts must retain their existing gates');
}

{
  type Event = { eventId: string; slug: string; displayName: string };
  let options: QueryObserverOptions<Event[]> | undefined;
  let queryResult: Record<string, unknown> = { data: undefined, isFetching: false, isRefetching: false, isError: true, error: new Error('조회 연결 실패'), refetch() {} };
  let savedTitle = '수정 전';
  let requests = 0;
  const screen = mount('src/app/my-invitations/MyInvitationsClient.tsx', {
    '@/contexts': { useAdmin: () => ({ authUser: { uid: 'owner', email: 'owner@example.com', emailVerified: true }, isLoggedIn: true, isAdminLoading: false }) },
    '@/lib/appQuery': { appQueryKeys, FIFTEEN_MINUTES_MS, THIRTY_MINUTES_MS },
    '@tanstack/react-query': { useQuery: (queryOptions: QueryObserverOptions<Event[]>) => { options = queryOptions; return queryResult; } },
  });
  const props = { gateway: { listEvents: async () => { requests++; return [{ eventId: 'one', slug: 'our-event', displayName: savedTitle }]; } }, routes: {} };
  const failure = screen.render(props);
  assert.doesNotMatch(JSON.stringify(failure), /아직 연결된 이벤트가 없습니다/,
    'A failed first load must not claim there are no connected events');
  assert.ok(nodes(failure).some((node) => node.props.role === 'alert'));
  click(failure, '다시 시도');
  queryResult = { ...queryResult, data: [{ eventId: 'one', slug: 'our-event', displayName: '이전 목록' }] };
  const cachedFailure = screen.render(props);
  assert.ok(nodes(cachedFailure).some((node) => (node.props.event as Event | undefined)?.eventId === 'one'),
    'A failed refresh must retain the previously loaded invitation');
  assert.match(JSON.stringify(cachedFailure), /이전에 조회한 목록/);
  queryResult = { data: [], isFetching: false, isRefetching: false, isError: false, error: null };
  assert.match(JSON.stringify(screen.render(props)), /아직 연결된 이벤트가 없습니다/,
    'A successful empty response must still explain how to request a connection');

  assert.ok(options);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.mount();
  client.setQueryData(options.queryKey!, [{ eventId: 'one', slug: 'our-event', displayName: '수정 전' }]);
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  assert.equal(requests, 0, 'The existing fresh cache must avoid an initial duplicate fetch');
  savedTitle = '다른 탭에서 저장한 제목';
  focusManager.setFocused(false); focusManager.setFocused(true);
  await settle();
  assert.equal(observer.getCurrentResult().data?.[0].displayName, '다른 탭에서 저장한 제목',
    'Returning to the list must fetch a save from another tab even while the old cache is fresh');
  assert.equal(requests, 1);
  unsubscribe(); client.unmount(); client.clear(); focusManager.setFocused(undefined);
}

console.log('고객 연결 확인·계정 전환·재시도·목록 복귀 검증 통과');
