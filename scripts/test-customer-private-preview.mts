import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { InvitationPage } from '../src/types/invitationPage.ts';

function loadModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  assert.ok(existsSync(path), `Authenticated customer preview implementation must exist: ${path}`);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, Date, URL, Response, console, require(name: string) {
    if (name === 'server-only') return {};
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports as T;
}

type PreviewError = Error & { status: number };
class CustomerEventClaimError extends Error { constructor(public status: number, message: string) { super(message); } }
let ownerStatus = 'ready';
let pageReads = 0;
const persistedPage = { slug: 'private-event', eventType: 'wedding', published: false,
  displayPeriodEnabled: true, displayPeriodStart: new Date('2025-01-01'),
  displayPeriodEnd: new Date('2025-02-01'), features: { showGuestbook: true, shareMode: 'kakao' },
} as unknown as InvitationPage;
const service = loadModule<{
  CustomerInvitationPreviewError: new (status: number, message: string) => PreviewError;
  getCustomerInvitationPreview(uid: string, slug: string): Promise<InvitationPage>;
}>('src/server/customerInvitationPreviewService.ts', {
  './customerEventsService': { getCustomerEditableInvitationPageSnapshot: async (uid: string, slug: string) => {
    assert.equal(uid, 'owner'); assert.equal(slug, 'private-event');
    if (ownerStatus === 'unavailable-throw') throw new CustomerEventClaimError(409, '현재 이용할 수 없는 초대장입니다.');
    return { status: ownerStatus, summary: null };
  } },
  './invitationPageServerService': { getServerInvitationPageBySlug: async (slug: string, options: unknown) => {
    assert.equal(slug, 'private-event');
    assert.deepEqual(JSON.parse(JSON.stringify(options)), { includePrivate: true, sampleFallbackMode: 'never' });
    pageReads++;
    return persistedPage;
  } },
});
const preview = await service.getCustomerInvitationPreview('owner', 'private-event');
assert.equal(preview.published, true, 'Only the authenticated response may bypass publication');
assert.equal(preview.displayPeriodEnabled, false);
assert.equal(preview.features.showGuestbook, false);
assert.equal(preview.features.shareMode, 'none');
assert.equal(persistedPage.published, false, 'Preview must never mutate the saved event');
assert.equal(persistedPage.features.showGuestbook, true);
for (const status of ['claimable', 'different-owner', 'missing', 'unavailable']) {
  ownerStatus = status;
  await assert.rejects(service.getCustomerInvitationPreview('owner', 'private-event'),
    (error: PreviewError) => error.status >= 400);
}
assert.equal(pageReads, 1, 'Non-owners must never read private invitation data');

let authenticated = true;
class CustomerApiAuthError extends Error { constructor(public status: number, message: string) { super(message); } }
const route = loadModule<{ GET(request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> }>(
  'src/app/api/customer/events/[slug]/preview/route.ts', {
    'next/server': { NextResponse: Response },
    '@/server/customerApiAuth': { CustomerApiAuthError, verifyCustomerUid: async (_request: Request, options: unknown) => {
      assert.deepEqual(JSON.parse(JSON.stringify(options)), { requireVerified: true });
      if (!authenticated) throw new CustomerApiAuthError(401, '다시 로그인해 주세요.');
      return 'owner';
    } },
    '@/server/customerInvitationPreviewService': service,
    '@/server/customerEventClaimPolicy': { CustomerEventClaimError },
    '@/server/apiErrorResponse': { toSafeHttpErrorResponse: (error: PreviewError) => Response.json({ error: error.message }, { status: error.status }) },
  });
ownerStatus = 'ready';
const context = { params: Promise.resolve({ slug: 'private-event' }) };
const response = await route.GET(new Request('https://example.test'), context);
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'no-store');
assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
ownerStatus = 'unavailable-throw';
assert.equal((await route.GET(new Request('https://example.test'), context)).status, 409,
  'Deletion-blocked events must retain their access error status');
authenticated = false;
assert.equal((await route.GET(new Request('https://example.test'), context)).status, 401);
assert.equal(pageReads, 2, 'Authentication failure must not load the private page');

const workspace = loadModule<{
  buildCustomerInvitationPreviewPath(slug: string, theme: string): string;
  getCustomerInvitationStatus(published: boolean, access?: unknown): { label: string; isPublic: boolean };
}>('src/lib/customerInvitationWorkspace.ts', {});
assert.equal(workspace.buildCustomerInvitationPreviewPath('our wedding', 'simple'), '/my-invitations/preview/our%20wedding/simple');
assert.equal(workspace.getCustomerInvitationStatus(true, { isPublic: false, reason: 'expired', adminLabel: '노출 종료' }).label, '노출 종료');
assert.equal(workspace.getCustomerInvitationStatus(true, { isPublic: false, reason: 'scheduled', adminLabel: '노출 시작 전' }).isPublic, false);
assert.equal(workspace.getCustomerInvitationStatus(true).label, '공개 설정됨', 'Legacy responses must not claim actual visibility');

// The authenticated page must isolate its renderer from an older dashboard preview cache.
const outerCache = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
const oldPage = { ...persistedPage, displayName: '이전 저장 내용' };
const latestPage = { ...persistedPage, displayName: '최신 저장 내용' };
outerCache.setQueryData(['invitation-page', 'private-event', 'experience'], oldPage);
const component: { default?: React.ComponentType<{ slug: string; theme: string }> } = {};
const provider: { default?: React.ComponentType<React.PropsWithChildren> } = {};
runInNewContext(ts.transpileModule(readFileSync('src/app/AppQueryProvider.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, { exports: provider, React, require(name: string) {
  return name === 'react' ? React : { QueryClient, QueryClientProvider };
} });
const componentSource = ts.transpileModule(readFileSync('src/app/my-invitations/preview/[slug]/[theme]/CustomerInvitationPreviewClient.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
runInNewContext(componentSource, { exports: component, React, require(name: string) {
  if (name === 'react') return React;
  if (name === '@tanstack/react-query') return { useQuery: () => ({ data: latestPage, dataUpdatedAt: 2, error: null }) };
  if (name === '@/app/AppQueryProvider') return { __esModule: true, default: provider.default };
  if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) };
  if (name === '@/contexts') return { useAdmin: () => ({ authUser: { uid: 'owner', emailVerified: true }, isLoggedIn: true, isAdminLoading: false }) };
  if (name.endsWith('/eventPageRendererRegistry')) return { resolveEventPageRenderer: () => ({ renderer: {
    isThemeSupported: () => true, resolveRouteTheme: () => 'simple',
    renderPage: (options: { initialPageConfig: InvitationPage }) => React.createElement(function RendererCacheConsumer() {
      const cached = useQueryClient().getQueryData<InvitationPage>(['invitation-page', 'private-event', 'experience']);
      return React.createElement('p', null, cached?.displayName ?? options.initialPageConfig.displayName);
    }),
  } }) };
  if (name.endsWith('/customerInvitationWorkspace')) return workspace;
  if (name.endsWith('.module.css')) return { __esModule: true, default: {} };
  return {};
} });
assert.ok(component.default);
const markup = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: outerCache },
  React.createElement(component.default, { slug: 'private-event', theme: 'simple' })));
assert.match(markup, /최신 저장 내용/);
assert.doesNotMatch(markup, /이전 저장 내용/, 'Old renderer caches must not overwrite a fresh authorized snapshot');
outerCache.clear();
console.log('Customer private preview ownership, publication isolation, authentication and status checks passed');
