import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as customerWorkspace from '../src/lib/customerInvitationWorkspace.ts';
import { appQueryKeys } from '../src/lib/appQuery.ts';

// Keep real component effects, dependencies, refs, and event handlers. Only platform I/O is replaced.
function mount(file: string, modules: Record<string, unknown>, globals: Record<string, unknown> = {}, exported = 'default') {
  const slots: unknown[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0;
  const changed = (before: unknown[] | undefined, after: unknown[]) => !before || after.some((value, index) => !Object.is(before[index], value));
  const react = {
    useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(fn: () => (() => void) | void, deps: unknown[]) { const index = cursor++;
      const previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
      if (changed(previous?.deps, deps)) { const entry = { deps, cleanup: undefined as (() => void) | undefined }; slots[index] = entry;
        effects.push(() => { previous?.cleanup?.(); entry.cleanup = fn() ?? undefined; }); } },
    useMemo(fn: () => unknown, deps: unknown[]) { const index = cursor++;
      const previous = slots[index] as { deps: unknown[]; value: unknown } | undefined;
      if (changed(previous?.deps, deps)) slots[index] = { deps, value: fn() };
      return (slots[index] as { value: unknown }).value; },
    useCallback(fn: unknown, deps: unknown[]) { return react.useMemo(() => fn, deps); },
  };
  const exports: Record<string, unknown> = {};
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  runInNewContext(source + (exported === 'default' ? '' : `\nexports.${exported} = ${exported};`), { exports, console, setTimeout, clearTimeout, AbortController, ...globals, require(id: string) {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) };
    return modules[id] ?? {};
  } });
  return {
    render(props = {}) { cursor = 0; const tree = (exports[exported] as (props: object) => unknown)(props); for (const effect of effects.splice(0)) effect(); return tree; },
  };
}
function button(tree: unknown, label: string): { onClick?: () => void; onPress?: () => void } | undefined {
  if (!tree || typeof tree !== 'object') return undefined;
  const node = tree as { props?: { children?: unknown; onClick?: () => void; onPress?: () => void } };
  if (node.props?.children === label) return node.props;
  for (const child of [node.props?.children].flat(Infinity)) { const found = button(child, label); if (found) return found; }
  return undefined;
}
const settle = () => new Promise(resolve => setImmediate(resolve));

{
  let linkToken = 'new-b';
  const calls: string[] = [];
  const destinations: string[] = [];
  const completions: Record<string, (success: boolean) => void> = {};
  const auth = { isAuthenticated: true, isReady: true, authError: null,
    clearAuthError() {}, loginWithLinkToken: (token: string) => { calls.push(token); return new Promise<boolean>(resolve => { completions[token] = resolve; }); } };
  const router = { replace: (path: string) => destinations.push(path) };
  const screen = mount('apps/mobile/src/app/login.tsx', {
    'expo-router': { Redirect: 'Redirect', useRouter: () => router, useLocalSearchParams: () => ({ linkToken }), useFocusEffect() {} },
    'react-native': { Platform: { OS: 'android' }, StyleSheet: { create: (value: unknown) => value } },
    '../contexts/AuthContext': { useAuth: () => auth },
    '../contexts/PreferencesContext': { usePreferences: () => ({ isReady: true, palette: {} }) },
    '../hooks/useNoticeToast': { useNoticeToast() {} },
    '../lib/appDeepLink': { normalizeLoginRedirectPath: () => '/manage' },
  });
  const pending = screen.render() as { type: string };
  assert.deepEqual(calls, ['new-b'], 'An existing A session must still exchange incoming B link exactly once');
  assert.notEqual(pending.type, 'Redirect', 'An existing session must not redirect while a new link is unresolved');
  linkToken = 'new-c';
  screen.render();
  completions['new-b'](true);
  await settle();
  assert.deepEqual(destinations, [], 'An obsolete B exchange must not navigate after C arrives');
  completions['new-c'](false);
  await settle();
  const failed = screen.render();
  assert.notEqual((failed as { type: string }).type, 'Redirect', 'A failed new link must offer recovery before using the existing session');
  const retry = button(failed, '앱 연동 다시 시도');
  assert.ok(retry?.onPress, 'Failed link must be retryable');
  retry.onPress();
  screen.render();
  assert.deepEqual(calls, ['new-b', 'new-c', 'new-c']);
  completions['new-c'](true);
  await settle();
  assert.deepEqual(destinations, ['/manage']);
}

{
  let inspections = 0;
  const inspect = async (_slug: string, token: string) => { inspections++; assert.equal(token, 'retained-token');
    if (inspections === 1) throw new Error('네트워크 연결을 확인해 주세요.');
    return { status: 'valid', displayName: '청첩장' }; };
  const screen = mount('src/app/connect/[slug]/ConnectOwnershipClient.tsx', {
    'next/navigation': { useRouter: () => ({ replace() {} }) },
    '@/contexts': { useAdmin: () => ({ isLoggedIn: false, isAdminLoading: false }) },
    '@/services/eventOwnershipInviteService': { inspectOwnershipInvite: inspect },
    '@/lib/customerAuthReturn': { buildConnectReturnTo: () => '/connect/sample#token=retained-token' },
    '../connect.module.css': { __esModule: true, default: {} },
  }, { TextEncoder, URLSearchParams, window: { location: { hash: '#token=retained-token' }, crypto: { subtle: { digest: async () => new Uint8Array([1]).buffer } } } });
  screen.render({ slug: 'sample' }); await settle();
  screen.render({ slug: 'sample' }); await settle();
  const retry = button(screen.render({ slug: 'sample' }), '다시 시도');
  assert.ok(retry?.onClick, 'The very first inspect failure must expose retry, before linkValidated is true');
  retry.onClick();
  screen.render({ slug: 'sample' }); await settle();
  screen.render({ slug: 'sample' });
  assert.equal(inspections, 2, 'Retry must inspect the retained token, not just rerun consumption');
}

for (const surface of ['list', 'result']) {
  let copyMode: 'success' | 'failed' | 'throw' = 'failed';
  const copiedAddresses: string[] = [];
  const modules = {
    '@/contexts': { useAdmin: () => ({ authUser: { uid: 'owner', emailVerified: true }, isLoggedIn: true, isAdminLoading: false }) },
    '@/lib/invitationMetadata': { PUBLIC_SITE_ORIGIN: 'https://invite.example' },
    '@/utils/copyTextToClipboard': { copyTextToClipboard: async (value: string) => { copiedAddresses.push(value); if (copyMode === 'throw') throw new Error('Denied'); return copyMode === 'success'; } },
    '@/lib/customerInvitationWorkspace': customerWorkspace,
    '@/lib/demoExperienceRoutes': { buildAppRoutes: () => ({ customerDashboard: () => '/my-invitations', wizardEdit: () => '/page-wizard/our%20event' }) },
    '@/lib/eventTypes': { getEventTypeDisplayLabel: () => '결혼식' },
    '@/hooks/useDialogLayer': { useDialogLayer() {} },
    '@/lib/appQuery': { appQueryKeys },
    '@/lib/eventPreviewLinks': { getEventPreviewLinks: () => [{ theme: 'simple' }], getEventTypeDefaultPreviewTheme: () => 'simple', buildEventPreviewPath: () => '/our%20event/simple' },
    '@/app/page-wizard/pageWizardEditorUtils': { normalizeFormConfig: (value: unknown) => value },
    '@/lib/invitationProducts': { resolveInvitationFeatures: () => ({}) },
    './pageWizardData': { getWizardSteps: () => [], applyDerivedWizardDefaults: (value: unknown) => value, buildReviewSummary: () => [] },
    './pageWizardShared': { formatSavedAt: () => '방금', getNoticeClassName: () => 'notice' },
    './page.module.css': { __esModule: true, default: {} },
    './PageWizardResultClient.module.css': { __esModule: true, default: {} },
    '@tanstack/react-query': { useQueryClient: () => ({}), useMutation: () => ({}), useQuery: () => surface === 'list' ? {} : ({
      data: { status: 'ready', configState: { published: false, defaultTheme: 'simple', config: { eventType: 'wedding', displayName: '우리 행사', couple: { groom: { name: '' }, bride: { name: '' } } } },
        publicAccess: { isPublic: false, adminLabel: '노출 종료' } },
    }) },
  };
  const screen = mount(surface === 'list' ? 'src/app/my-invitations/MyInvitationsClient.tsx' : 'src/app/page-wizard/PageWizardResultClient.tsx', modules, {}, surface === 'list' ? 'OwnedEventCard' : 'default');
  const props = surface === 'list' ? { authUid: 'owner', gateway: {}, routes: { wizardEdit: () => '/page-wizard/our%20event' }, experience: false,
    event: { slug: 'our event', eventType: 'wedding', published: false, publicAccess: { isPublic: false, adminLabel: '노출 종료' } } } : { slug: 'our event' };
  for (const mode of ['failed', 'throw', 'success'] as const) {
    copyMode = mode;
    const action = button(screen.render(props), '하객용 링크 복사');
    assert.ok(action?.onClick, `${surface}: a guest copy action is available`);
    action.onClick(); await settle();
    const tree = JSON.stringify(screen.render(props));
    assert.match(tree, mode === 'success' ? /하객용 링크를 복사했습니다/ : /링크를 복사하지 못했습니다/);
    assert.match(tree, /로그인한 소유자만/);
    assert.match(tree, /하객이 열 수 없습니다/);
  }
  assert.deepEqual(copiedAddresses, Array(3).fill('https://invite.example/our%20event'), `${surface}: guest sharing never copies an authenticated preview route`);
}
console.log('Customer and mobile link recovery checks passed');
