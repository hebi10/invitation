import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient } from '@tanstack/react-query';
import { appQueryKeys, FIFTEEN_MINUTES_MS } from '../src/lib/appQuery.ts';

// Execute the real persistence callback against TanStack's cache: no Firebase requests.
const wizardSource = ts.createSourceFile('PageWizardClient.tsx',
  readFileSync('src/app/page-wizard/PageWizardClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback: ts.Expression | undefined;
function visit(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(wizardSource) === 'onPersisted') callback = node.initializer;
  ts.forEachChild(node, visit);
}
visit(wizardSource);
assert.ok(callback, 'The save completion callback must exist');
const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
const resultKey = ['page-wizard-result', 'sample', 'customer', false, true];
const otherKey = ['page-wizard-result', 'other', 'customer', false, true];
client.setQueryData(resultKey, 'previous content');
client.setQueryData(otherKey, 'other invitation');
const emitted = ts.transpileModule(`const onPersisted = ${callback.getText(wizardSource)}; onPersisted;`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const onPersisted = runInNewContext(emitted, {
  queryClient: client, appQueryKeys, authUser: { uid: 'customer' }, published: false,
  defaultTheme: 'simple', setPersistedPublished() {}, setHasUnsavedChanges() {},
  normalizeInvitationProductTier: (value: unknown) => value, resolveInvitationFeatures: () => ({}),
});
await onPersisted({ slug: 'sample', config: {}, version: 2, published: false });
let fetched = false;
const refreshed = await client.fetchQuery({ queryKey: resultKey, staleTime: FIFTEEN_MINUTES_MS,
  queryFn: async () => { fetched = true; return 'latest saved content'; } });
assert.equal(refreshed, 'latest saved content', 'Returning to the result must show the latest save');
assert.equal(fetched, true);
assert.equal(client.getQueryState(otherKey)?.isInvalidated, false, 'Other invitations stay untouched');
client.clear();

// Render the real result component with a local ready state and authentication fixture.
let admin = false;
const config = { displayName: '우리의 초대장', eventType: 'wedding', couple: { groom: { name: '신랑' }, bride: { name: '신부' } } };
const componentExports: { default?: React.ComponentType<{ slug: string; experience?: boolean }> } = {};
const resultSource = ts.transpileModule(readFileSync('src/app/page-wizard/PageWizardResultClient.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
runInNewContext(resultSource, { exports: componentExports, React, require(name: string) {
  if (name === 'react') return React;
  if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) };
  if (name === '@tanstack/react-query') return { useQuery: () => ({
    data: { status: 'ready', configState: { config, published: false, defaultTheme: 'simple' } },
    isLoading: false, isFetching: false, isStale: false,
  }) };
  if (name === '@/contexts') return { useAdmin: () => ({ isLoggedIn: true, isAdminLoggedIn: admin, isAdminLoading: false, authUser: { uid: 'customer', emailVerified: true } }) };
  if (name.endsWith('/demoExperienceRoutes')) return { buildAppRoutes: () => ({ customerDashboard: () => '/my-invitations', admin: () => '/admin', wizardEdit: () => '/page-wizard/sample', preview: () => '/sample' }) };
  if (name.endsWith('/pageWizardEditorUtils')) return { normalizeFormConfig: (value: unknown) => value };
  if (name.endsWith('/pageWizardData')) return { getWizardSteps: () => [], applyDerivedWizardDefaults: (value: unknown) => value, buildReviewSummary: () => [] };
  if (name.endsWith('/invitationProducts')) return { resolveInvitationFeatures: () => ({}) };
  if (name.endsWith('/eventPreviewLinks')) return { buildEventPreviewPath: () => '/sample/simple', getEventTypeDefaultPreviewTheme: () => 'simple' };
  if (name.endsWith('/pageWizardShared')) return { formatSavedAt: () => '방금', getNoticeClassName: () => 'notice' };
  if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_object, key) => String(key) }) };
  return {};
} });
assert.ok(componentExports.default);
const customer = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample' }));
assert.match(customer, /<a[^>]*href="\/my-invitations"[^>]*class="primaryButton"[^>]*>내 청첩장으로 이동<\/a>/,
  'A successful customer save must lead directly to their dashboard');
assert.match(customer, /href="\/page-wizard\/sample"/, 'Customers can continue editing');
assert.match(customer, /공유 URL/);
assert.doesNotMatch(customer, /실제 페이지 URL/,
  'Customers should see one sharing address rather than two competing URLs');
assert.match(customer, /비공개 · 마지막 저장 방금/);
assert.doesNotMatch(customer, /<details[^>]*\bopen(?:=|\s|>)/,
  'Saved section details are optional on the customer completion screen');
assert.match(customer, /저장한 내용 자세히 보기/);
admin = true;
const administrator = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample' }));
assert.match(administrator, /href="\/admin"/, 'Administrators return to their own workspace');
assert.match(administrator, /실제 페이지 URL/,
  'Administrators retain their page routing details');
assert.match(administrator, /<details[^>]*\bopen(?:=|\s|>)/,
  'Administrators retain an expanded saved-content review');
console.log('Customer completion navigation and fresh saved result checks passed');
