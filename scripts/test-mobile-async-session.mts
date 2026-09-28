import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// React Native is not available in Node. Keep state/ref slots across renders;
// exercise the provider's real asynchronous callbacks with controlled API I/O.
const slots: unknown[] = [];
let cursor = 0;
let value: Record<string, unknown>;
let auth = { session: { pageSlug: 'page-a', token: 'token-a' }, initialDashboardSeed: null,
  consumeInitialDashboardSeed() {}, reportAuthError() {}, getHighRiskToken: () => null };
const finishRequests: Record<string, (dashboard: unknown) => void> = {};
let finishSave: (() => void) | null = null;
let saves = 0;
const exports: Record<string, unknown> = {};
const source = ts.transpileModule(readFileSync('apps/mobile/src/contexts/InvitationOpsContext.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(source, { exports, require(id: string) {
  if (id === 'react') return {
    createContext: () => ({ Provider: 'provider' }),
    useState(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(initial: unknown) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(), useEffect() {},
  };
  if (id === 'react/jsx-runtime') return { jsx: (_type: unknown, props: { value: typeof value }) => { value = props.value; return props; } };
  if (id === './AuthContext') return { useAuth: () => auth };
  if (id === './PreferencesContext') return { usePreferences: () => ({ apiBaseUrl: 'https://example.test' }) };
  if (id === '../lib/api') return {
    fetchMobileInvitationDashboard: (_base: string, slug: string) => new Promise(resolve => { finishRequests[slug] = resolve; }),
    saveMobileInvitationPageConfig: async () => { saves += 1; await new Promise<void>(resolve => { finishSave = resolve; }); },
  };
  throw new Error(`Unexpected module ${id}`);
} });
function render() { cursor = 0; (exports.InvitationOpsProvider as (props: object) => unknown)({}); }
render();
const refresh = value!.refreshDashboard as () => Promise<boolean>;
const pendingA = refresh();
auth = { ...auth, session: { pageSlug: 'page-b', token: 'token-b' } };
render();
const pendingB = (value!.refreshDashboard as () => Promise<boolean>)();
assert.equal(typeof finishRequests['page-b'], 'function', 'An unfinished A query must not block the new B query');
finishRequests['page-b']({ page: { slug: 'page-b', config: { slug: 'page-b', displayName: 'B' } }, ticketCount: 2 });
assert.equal(await pendingB, true);
finishRequests['page-a']({ page: { slug: 'page-a', config: { displayName: 'A' } }, ticketCount: 1 });
assert.equal(await pendingA, false, 'A response must be discarded after switching the active invitation to B');
render();
assert.equal((value!.dashboard as { page: { slug: string } }).page.slug, 'page-b', 'An obsolete response must not populate B with A data');
const save = value!.saveCurrentPageConfig as (config: object) => Promise<boolean>;
assert.equal(await save({ slug: 'page-a', displayName: 'A' }), false, 'A form cannot be rewritten to B by replacing its slug');
assert.equal(saves, 0, 'Mismatched form data must never reach the save API');
const savingB = save({ slug: 'page-b', displayName: 'Edited B' });
auth = { ...auth, session: { pageSlug: 'page-c', token: 'token-c' } };
render();
assert.equal(value!.dashboard, null, 'A newly selected page must hide another page even before effects run');
assert.ok(finishSave);
(finishSave as () => void)();
assert.equal(await savingB, false, 'An obsolete save completion must not update the newly selected invitation');
// Keep an A form open while the active dashboard changes to B.
{
  const formSlots: unknown[] = [];
  let index = 0;
  const effects: (() => void)[] = [];
  let saved = 0;
  const form = { groom: { name: 'Groom A' }, bride: { name: 'Bride A' }, galleryImages: [],
    galleryImageThumbnailUrls: [], coverImageThumbnailUrl: '', coverImageUrl: '', kakaoMarkerTitle: '', venue: '', ceremonyAddress: '' };
  const formExports: Record<string, unknown> = {};
  const formSource = ts.transpileModule(readFileSync('apps/mobile/src/features/manage/hooks/useInvitationForm.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(formSource, { exports: formExports, setTimeout: (fn: () => void) => fn(), require(id: string) {
    if (id === 'react') return {
      useState(initial: unknown) { const slot = index++; if (!(slot in formSlots)) formSlots[slot] = initial;
        return [formSlots[slot], (next: unknown) => { formSlots[slot] = typeof next === 'function' ? next(formSlots[slot]) : next; }]; },
      useRef(initial: unknown) { const slot = index++; return formSlots[slot] ??= { current: initial }; },
      useCallback: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(), useEffect: (fn: () => void) => effects.push(fn),
    };
    if (id === '../../../contexts/AuthContext') return { useAuth: () => ({ runHighRiskAction: async () => false }) };
    if (id === '@react-navigation/native') return { useIsFocused: () => false };
    if (id === '../buildConfigFromForm') return { buildConfigFromForm: ({ dashboard }: { dashboard: { page: { slug: string } } }) => ({ ...form, slug: dashboard.page.slug }) };
    if (id === '../shared') return { EMPTY_FORM: form, EDITOR_STEPS: ['basic'], ONBOARDING_STEPS: ['basic'],
      getOnboardingValidationMessage: () => '', parseOptionalNumber: () => null, hasValidCoordinates: () => false,
      buildManageFormFromDashboard: () => form };
    throw new Error(`Unexpected module ${id}`);
  } });
  let dashboard = { page: { slug: 'page-a', published: false } };
  function renderForm() {
    index = 0;
    const result = (formExports.useInvitationForm as (options: object) => { openEditorModal: () => Promise<void>; persistForm: (options: object) => Promise<boolean> })({
      dashboard, pendingManageOnboarding: null, dashboardLoading: false, clearAuthError() {}, clearPendingManageOnboarding() {},
      refreshDashboard: async () => true, saveCurrentPageConfig: async () => { saved++; return true; }, setPublishedState: async () => true, setNotice() {},
    });
    for (const effect of effects.splice(0)) effect();
    return result;
  }
  await renderForm().openEditorModal();
  renderForm();
  dashboard = { page: { slug: 'page-b', published: false } };
  assert.equal(await renderForm().persistForm({}), false, 'An open A form must not save against the newly selected B dashboard');
  assert.equal(saved, 0);
}
console.log('mobile async session isolation checks passed');
