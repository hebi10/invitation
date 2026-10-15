import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createWizardMutationGuard } from '../src/app/page-wizard/wizardImageUploadState.ts';

const source = ts.createSourceFile('PageWizardClient.tsx',
  readFileSync('src/app/page-wizard/PageWizardClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let loadEffect: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect'
    && node.arguments[0]?.getText(source).includes('applyLoadedEditableConfig(')) loadEffect = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(loadEffect);
const effectCode = ts.transpileModule(`(${loadEffect.getText(source)})();`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function applyQuery({ fetching = false, error = null, initialized = true }: {
  fetching?: boolean; error?: Error | null; initialized?: boolean;
} = {}) {
  const edits = { name: '아직 저장하지 않은 이름' };
  let form: unknown = edits;
  let dirty = true;
  const notices: unknown[] = [];
  const loadedEditorIdentityRef = { current: initialized ? 'customer:sample' : null };
  runInNewContext(effectCode, {
    isAdminLoading: false, requiresEmailVerification: false, isAdminLoggedIn: false,
    isLoggedIn: true, setupOnly: false, initialSlug: 'sample',
    editorIdentity: 'customer:sample', loadedEditorIdentityRef,
    ownedEventFallbackEditableConfig: null, isOwnedEventsCheckPendingForInitialSlug: false,
    wizardLoadQuery: { isPending: false, isFetching: fetching, error,
      data: { status: 'ready', editableConfig: { name: '저장된 이름' }, version: 3 } },
    applyLoadedEditableConfig(config: unknown) { form = config; dirty = false; },
    setIsLoading() {}, setRequiresOwnershipClaim() {}, setAccessErrorMessage() {},
    setFormState(value: unknown) { form = value; },
    showErrorNotice(value: unknown) { notices.push(value); },
    wizardPresentation: { loadErrorMessage: '조회 실패' },
  });
  return { form, dirty, edits, notices, initialized: loadedEditorIdentityRef.current };
}

const loading = applyQuery({ fetching: true });
assert.equal(loading.form, loading.edits, '조회 시작 시 캐시로 미저장 입력을 덮어쓰면 안 됩니다.');
assert.equal(loading.dirty, true);
const failed = applyQuery({ error: new Error('일시적 네트워크 오류') });
assert.equal(failed.form, failed.edits, '조회 실패 뒤에도 현재 입력을 유지해야 합니다.');
assert.equal(failed.dirty, true);
assert.equal(failed.notices.length, 1);
const background = applyQuery();
assert.equal(background.form, background.edits, '백그라운드 갱신은 현재 편집을 초기화하면 안 됩니다.');
const first = applyQuery({ initialized: false });
assert.equal((first.form as { name: string }).name, '저장된 이름', '첫 진입에는 조회 성공 결과를 적용합니다.');
assert.equal(first.initialized, 'customer:sample');
console.log('wizard cached reload and unsaved input preservation checks passed');

function getNamedAction(name: string, context: Record<string, unknown>) {
  let action: ts.Expression | undefined;
  function find(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) action = node.initializer;
    ts.forEachChild(node, find);
  }
  find(source);
  assert.ok(action, `${name} must exist`);
  return runInNewContext(ts.transpileModule(`(${action.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, context) as () => Promise<void>;
}

const saved = { status: 'ready', editableConfig: { name: '서버의 최신 이름' }, version: 7 };
let refetches = 0;
let approved = false;
let applied: unknown = null;
let busy = false;
let finish: (value: unknown) => void = () => {};
const notices: unknown[] = [];
const context = {
  reloadInFlightRef: { current: false }, isSaving: false, uploadingField: null,
  isConnectingCustomer: false, hasUnsavedChanges: true,
  window: { confirm: () => approved }, mutationGuard: createWizardMutationGuard(),
  setIsReloading(value: boolean) { busy = value; },
  wizardLoadQuery: { refetch: async () => {
    refetches += 1;
    return await new Promise(resolve => { finish = resolve; });
  } },
  showErrorNotice(error: unknown) { notices.push(error); },
  showNotice(_tone: string, text: string) { notices.push(text); },
  applyLoadedEditableConfig(config: unknown, version: number) { applied = { config, version }; },
  loadedEditorIdentityRef: { current: 'customer:sample' }, editorIdentity: 'customer:sample',
};
const reload = getNamedAction('handleReloadWizard', context);
await reload();
assert.equal(refetches, 0, '취소하면 조회와 입력 변경이 모두 없어야 합니다.');
approved = true;
const failedReload = reload();
assert.equal(busy, true);
await reload();
assert.equal(refetches, 1, '빠른 연속 클릭은 중복 조회를 만들면 안 됩니다.');
assert.equal(applied, null, '응답 전에는 현재 입력을 유지해야 합니다.');
finish({ data: saved, error: new Error('network unavailable') });
await failedReload;
assert.equal(applied, null, '실패 응답에 캐시 데이터가 있어도 적용하면 안 됩니다.');
assert.equal(busy, false);
const success = reload();
finish({ data: saved, error: null });
await success;
assert.equal((applied as { version: number }).version, 7, '명시적 조회 성공 뒤 최신 버전까지 적용해야 합니다.');
assert.equal(busy, false);

let destination = '';
const returnToList = getNamedAction('handleReturnToList', {
  ...context, isAdminLoggedIn: false,
  router: { push(value: string) { destination = value; } },
  routes: { admin: () => '/admin', customerDashboard: () => '/my-invitations' },
});
approved = false;
await returnToList();
assert.equal(destination, '', '미저장 상태에서 목록 복귀를 취소하면 편집기에 남아야 합니다.');
approved = true;
await returnToList();
assert.equal(destination, '/my-invitations');

let queryFn: ts.Expression | undefined;
function findQuery(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'wizardLoadQuery'
    && node.initializer && ts.isCallExpression(node.initializer)) {
    const options = node.initializer.arguments[0] as ts.ObjectLiteralExpression;
    const property = options.properties.find(prop => ts.isPropertyAssignment(prop) && prop.name.getText(source) === 'queryFn') as ts.PropertyAssignment;
    queryFn = property.initializer;
  }
  ts.forEachChild(node, findQuery);
}
findQuery(source);
assert.ok(queryFn);
let writes = 0;
let imageLists = 0;
const editable = { config: { metadata: { images: { wedding: 'keep.jpg' } }, pageData: { galleryImages: [] } }, version: 4 };
const load = runInNewContext(ts.transpileModule(`(${queryFn.getText(source)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, {
  initialSlug: 'sample', experience: false, isAdminLoggedIn: true,
  getEditableInvitationPageConfig: async () => editable,
  applyWizardStorageImageFallback: async () => { imageLists += 1; throw new Error('Storage unavailable'); },
  saveInvitationPageConfig: async () => { writes += 1; },
});
assert.equal((await load()).editableConfig, editable);
assert.equal(writes, 0, '관리자 편집기 진입은 내용을 저장하지 않아야 합니다.');
assert.equal(imageLists, 0, '사진 목록 조회 실패가 편집 내용에 영향을 주면 안 됩니다.');
console.log('wizard explicit reload, cancel, failure, navigation and read-only loading checks passed');

const serviceSource = ts.createSourceFile('invitationPageService.ts',
  readFileSync('src/services/invitationPageService.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const editableReader = serviceSource.statements.find(node => ts.isFunctionDeclaration(node)
  && node.name?.text === 'getEditableInvitationPageConfig') as ts.FunctionDeclaration;
assert.ok(editableReader);
const serviceExports: Record<string, (slug: string) => Promise<unknown>> = {};
runInNewContext(ts.transpileModule(editableReader.getText(serviceSource), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: serviceExports,
  getWeddingPageBySlug: () => ({ displayName: '샘플 원본' }),
  sanitizeHeartIconPlaceholdersDeep: (value: unknown) => value,
  normalizeInvitationProductTier: () => 'premium', resolveInvitationFeatures: () => ({}),
  DEFAULT_INVITATION_PRODUCT_TIER: 'premium', DEFAULT_INVITATION_THEME: 'simple',
  ensureFirestoreState: async () => null,
});
await assert.rejects(serviceExports.getEditableInvitationPageConfig('sample'),
  '저장소 초기화 실패를 샘플 내용의 성공 응답으로 바꾸면 안 됩니다.');
