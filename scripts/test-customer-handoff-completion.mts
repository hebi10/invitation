import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient } from '@tanstack/react-query';
import { appQueryKeys, FIFTEEN_MINUTES_MS } from '../src/lib/appQuery.ts';
import * as customerWorkspace from '../src/lib/customerInvitationWorkspace.ts';
import * as adminWizardNavigation from '../src/lib/adminWizardNavigation.ts';

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
const publicAccess = { current: undefined as unknown };
const config = { displayName: '우리의 초대장', eventType: 'wedding', couple: { groom: { name: '신랑' }, bride: { name: '신부' } } };
const componentExports: { default?: React.ComponentType<{ slug: string; experience?: boolean; returnTo?: string }> } = {};
const resultSource = ts.transpileModule(readFileSync('src/app/page-wizard/PageWizardResultClient.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
runInNewContext(resultSource, { exports: componentExports, React, require(name: string) {
  if (name === 'react') return React;
  if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) };
  if (name === '@tanstack/react-query') return { useQuery: () => ({
    data: { status: 'ready', configState: { config, published: false, defaultTheme: 'simple' }, publicAccess: publicAccess.current },
    isLoading: false, isFetching: false, isStale: false,
  }) };
  if (name === '@/contexts') return { useAdmin: () => ({ isLoggedIn: true, isAdminLoggedIn: admin, isAdminLoading: false, authUser: { uid: 'customer', emailVerified: true } }) };
  if (name.endsWith('/demoExperienceRoutes')) return { buildAppRoutes: () => ({ customerDashboard: () => '/my-invitations', admin: () => '/admin', wizardEdit: () => '/page-wizard/sample', preview: () => '/sample' }) };
  if (name.endsWith('/pageWizardEditorUtils')) return { normalizeFormConfig: (value: unknown) => value };
  if (name.endsWith('/pageWizardData')) return { getWizardSteps: () => [], applyDerivedWizardDefaults: (value: unknown) => value, buildReviewSummary: () => [] };
  if (name.endsWith('/invitationProducts')) return { resolveInvitationFeatures: () => ({}) };
  if (name.endsWith('/eventPreviewLinks')) return { buildEventPreviewPath: () => '/sample/simple', getEventTypeDefaultPreviewTheme: () => 'simple' };
  if (name.endsWith('/customerInvitationWorkspace')) return customerWorkspace;
  if (name.endsWith('/adminWizardNavigation')) return adminWizardNavigation;
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
assert.match(customer, /하객용 링크 복사/, 'The saved result must offer a direct guest sharing action');
assert.match(customer, /로그인한 소유자만/, 'Private preview must be distinguishable from a guest link');
assert.doesNotMatch(customer, /실제 페이지 URL/,
  'Customers should see one sharing address rather than two competing URLs');
assert.match(customer, /비공개 · 마지막 저장 방금/);
assert.doesNotMatch(customer, /<details[^>]*\bopen(?:=|\s|>)/,
  'Saved section details are optional on the customer completion screen');
assert.match(customer, /저장한 내용 자세히 보기/);
assert.match(customer, /href="\/my-invitations\/preview\/sample\/simple"/,
  'Customers must be able to inspect a private saved draft without publishing it');
publicAccess.current = { isPublic: false, reason: 'expired', adminLabel: '노출 종료', adminDescription: '공개 기간이 종료되었습니다.' };
const expiredCustomer = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample' }));
assert.match(expiredCustomer, /노출 종료 · 마지막 저장 방금/,
  'The saved result must show actual access state rather than publication setting');
assert.match(expiredCustomer, /하객이 열 수 없습니다/, 'An expired invitation must not imply that copying publishes it');
admin = true;
const administrator = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample' }));
assert.match(administrator, /href="\/admin"/, 'Administrators return to their own workspace');
assert.match(administrator, /실제 페이지 URL/,
  'Administrators retain their page routing details');
assert.match(administrator, /<details[^>]*\bopen(?:=|\s|>)/,
  'Administrators retain an expanded saved-content review');
const adminReturnTo = '/admin?pageQ=test&page=3&pageSort=name&event=sample';
const contextualAdministrator = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample', returnTo: adminReturnTo }));
const adminBackHref = contextualAdministrator.match(/<a[^>]*href="([^"]+)"[^>]*>관리자 화면으로 이동<\/a>/)?.[1];
assert.equal(adminBackHref?.replaceAll('&amp;', '&'), adminReturnTo, 'saved results must retain the original administrator list and selected event');
const contextualEditHref = contextualAdministrator.match(/<a[^>]*href="([^"]+)"[^>]*>편집 화면으로 돌아가기<\/a>/)?.[1];
assert.ok(contextualEditHref);
assert.equal(new URL(contextualEditHref.replaceAll('&amp;', '&'), 'https://invitation.test').searchParams.get('returnTo'), adminReturnTo);
const unsafeAdministrator = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample', returnTo: '//evil.example/admin' }));
assert.match(unsafeAdministrator, /href="\/admin"/, 'results reject an external administrator return address');
assert.doesNotMatch(unsafeAdministrator, /evil\.example/);
admin = false;
const customerWithAdminContext = renderToStaticMarkup(React.createElement(componentExports.default, { slug: 'sample', returnTo: adminReturnTo }));
assert.match(customerWithAdminContext, /href="\/my-invitations"[^>]*class="primaryButton"/, 'customers ignore administrator return context');
assert.match(customerWithAdminContext, /href="\/page-wizard\/sample"/, 'customer editing stays on its original route');
console.log('Customer completion navigation and fresh saved result checks passed');
