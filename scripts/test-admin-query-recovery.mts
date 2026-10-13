import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
import AdminEventCustomerTab from '../src/app/admin/_components/AdminEventCustomerTab.tsx';
import AdminEventCommentsTab from '../src/app/admin/_components/AdminEventCommentsTab.tsx';
import AdminCustomerAccountsTab from '../src/app/admin/_components/AdminCustomerAccountsTab.tsx';
import AdminCommentsTab from '../src/app/admin/_components/AdminCommentsTab.tsx';
import { buildAppRoutes } from '../src/lib/demoExperienceRoutes.ts';
import { getAdminOwnershipInviteStatusQueryKey } from '../src/app/admin/_hooks/adminOwnershipInviteQuery.ts';
import type { InvitationPageSummary } from '../src/services/invitationPageService.ts';
import type { AdminCustomerAccountSummary } from '../src/services/adminCustomerService.ts';

const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query') as typeof import('@tanstack/react-query');
Object.assign(globalThis, { React });

function resolveComponent<T>(component: T): T {
  return (component as T & { default?: T }).default ?? component;
}

const policyPath = resolve('src/app/admin/_components/adminQueryRecovery.ts');
const policy = existsSync(policyPath) ? await import(pathToFileURL(policyPath).href) : {};

function executeNormalizationEffect(path: string, needle: string, state: Record<string, unknown>) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useEffect' &&
        node.arguments[0]?.getText(source).includes(needle)) callback = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source);
  const updates: Record<string, string | null>[] = [];
  if (!callback) return updates;
  const emitted = ts.transpileModule(`const effect = ${callback.getText(source)}; effect;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const effect = runInNewContext(emitted, {
    shouldNormalizeAdminPageQuery: policy.shouldNormalizeAdminPageQuery,
    onQueryChange: (update: Record<string, string | null>) => updates.push(update),
    updateQuery: (update: Record<string, string | null>) => updates.push(update),
    updateCustomerQuery: (update: Record<string, string | null>) => updates.push(update),
    ...state,
  }) as () => void;
  effect();
  return updates;
}

const ready = {
  currentPage: 3, eventPage: { currentPage: 1 }, normalizedCurrentPage: 1,
  loading: false, refreshing: false, error: null, selectedSlug: null,
  commentsLoading: false, commentsRefreshing: false, commentsError: null,
  commentScopeDependsOnPages: false, pagesLoading: false, pagesRefreshing: false, pagesError: null,
  isHomeView: false, renderedActiveTab: 'comments', mobileReadOnly: false, selectedCustomerUid: '',
};
const targets = [
  { file: 'src/app/admin/_components/AdminEventWorkspace.tsx', needle: 'page: String(eventPage.currentPage)', key: 'page' },
  { file: 'src/app/admin/AdminPageClient.tsx', needle: 'commentPage: String(normalizedCurrentPage)', key: 'commentPage' },
  { file: 'src/app/admin/_components/AdminCustomerAccountsTab.tsx', needle: 'customerPage: String(normalizedCurrentPage)', key: 'customerPage' },
];
for (const target of targets) {
  assert.equal(executeNormalizationEffect(target.file, target.needle, { ...ready, loading: true, commentsLoading: true }).length, 0,
    `${target.key}: an empty initial cache must not overwrite the requested page`);
  assert.equal(executeNormalizationEffect(target.file, target.needle, { ...ready, refreshing: true, commentsRefreshing: true }).length, 0,
    `${target.key}: pending refresh must preserve the requested page`);
  assert.equal(executeNormalizationEffect(target.file, target.needle, { ...ready, error: new Error('offline'), commentsError: new Error('offline') }).length, 0,
    `${target.key}: failed queries must preserve the requested page`);
  const corrected = executeNormalizationEffect(target.file, target.needle, ready);
  assert.equal(corrected.length, 1, `${target.key}: a successful loaded query must normalize an out-of-range page`);
  assert.equal(corrected[0]?.[target.key], '1');
}
assert.equal(executeNormalizationEffect(targets[0].file, targets[0].needle, { ...ready, selectedSlug: 'one' }).length, 0, 'event detail must not rewrite its hidden list page');
assert.equal(executeNormalizationEffect(targets[1].file, targets[1].needle, { ...ready, renderedActiveTab: 'pages' }).length, 0, 'inactive comments must not overwrite their saved page');
assert.equal(executeNormalizationEffect(targets[1].file, targets[1].needle, { ...ready, commentScopeDependsOnPages: true, pagesLoading: true }).length, 0, 'legacy category-filtered comments must wait for the page scope query');
assert.equal(executeNormalizationEffect(targets[2].file, targets[2].needle, { ...ready, mobileReadOnly: true, selectedCustomerUid: 'one' }).length, 0, 'mobile customer detail must not rewrite its hidden list page');

const account: AdminCustomerAccountSummary = {
  uid: 'customer-one', email: 'customer@example.test', displayName: '테스트 고객',
  isAdmin: false, disabled: false, emailVerified: true, providerIds: ['password'],
  createdAt: null, lastSignInAt: null, missingAuthUser: false,
  linkedEvents: [{ eventId: 'event-one', slug: 'event-one', eventType: 'wedding', displayName: '기존 연결 이벤트', published: false, defaultTheme: 'simple', updatedAt: null }],
  wallet: { pageCreationCredits: { standard: 0, deluxe: 0, premium: 0 }, operationTicketBalance: 0, updatedAt: null, recentLedger: [] },
};
const page = { slug: 'event-one', ownershipKind: 'customer' } as InvitationPageSummary;
const noAction = () => {};
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
client.setQueryData(getAdminOwnershipInviteStatusQueryKey(page.slug), { status: 'consumed', createdAt: null, expiresAt: null, consumedAt: null });
const customerMarkup = renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
  React.createElement(resolveComponent(AdminEventCustomerTab), {
    page, accounts: [account], loading: false, error: new Error('offline'), ownershipActionToken: null,
    issuingInvite: false, onRefresh: noAction, onAssign: noAction, onClear: noAction, onIssueInvite: noAction, onOpenCustomer: noAction,
  })));
assert.match(customerMarkup, /role="alert"/, 'cached customer detail must disclose a failed refresh');
assert.match(customerMarkup, /테스트 고객/, 'cached customer information must remain visible after refresh failure');
assert.match(customerMarkup, /이전에 조회한/, 'customer detail must identify its retained information as previous data');
assert.match(customerMarkup, /다시 시도/);
const commentMarkup = renderToStaticMarkup(React.createElement(resolveComponent(AdminEventCommentsTab), {
  pageSlug: 'event-one', comments: [{ id: 'one', author: '축하 손님', message: '기존 메시지', pageSlug: 'event-one', createdAt: new Date('2026-10-01') }],
  loading: false, refreshing: false, error: new Error('offline'), onRefresh: noAction, onDelete: noAction,
}));
assert.match(commentMarkup, /role="alert"/, 'cached comments must disclose a failed refresh');
assert.match(commentMarkup, /기존 메시지/);
assert.match(commentMarkup, /이전에 조회한/);
assert.match(commentMarkup, /다시 시도/);
const commentScopeProps = {
  deletingCommentToken: null, commentsLoading: false, commentsRefreshing: false, commentsError: null,
  comments: [{ id: 'one', author: '축하 손님', message: '기존 메시지', pageSlug: 'event-one', createdAt: new Date('2026-10-01') }],
  filteredComments: [], currentComments: [], currentPage: 1, totalPages: 1,
  commentSearch: '', selectedPageSlug: 'all', commentAgeFilter: 'all' as const, isEventFilterActive: false,
  chips: [], commentPageOptions: [], mobileReadOnly: false,
  onRefresh: noAction, onRetryComments: noAction, onQueryChange: noAction, onDeleteComment: noAction,
  eventScopeLoading: false, eventScopeError: new Error('scope offline'), hasPreviousEventScope: false, onRetryEventScope: noAction,
};
const scopeErrorMarkup = renderToStaticMarkup(React.createElement(resolveComponent(AdminCommentsTab), commentScopeProps));
assert.match(scopeErrorMarkup, /이벤트 유형.*불러오지 못했습니다/, 'failed event scope queries must explain why category-filtered comments are unavailable');
assert.doesNotMatch(scopeErrorMarkup, /현재 조건에 맞는 방명록이 없습니다/, 'failed scope queries must not imply that matching comments do not exist');
const scopeLoadingMarkup = renderToStaticMarkup(React.createElement(resolveComponent(AdminCommentsTab), {
  ...commentScopeProps, eventScopeError: null, eventScopeLoading: true,
}));
assert.match(scopeLoadingMarkup, /이벤트 유형 정보를 불러오는 중/, 'category-filtered comments must wait for their event scope');

const router = { back: noAction, forward: noAction, refresh: noAction, push: noAction, replace: noAction, prefetch: async () => {} };
const accountMarkup = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: router },
  React.createElement(PathnameContext.Provider, { value: '/admin' },
    React.createElement(SearchParamsContext.Provider, { value: new URLSearchParams('section=customers&tab=accounts&customer=customer-one') },
      React.createElement(resolveComponent(AdminCustomerAccountsTab), {
        loading: false, refreshing: false, error: null, accounts: [account],
        unassignedEvents: [{ ...account.linkedEvents[0], slug: 'event-two', eventId: 'event-two' }],
        ownershipActionToken: 'assign:customer-one:event-one', issuingOwnershipInviteSlug: null, deletingCustomerUid: null,
        selectedEventSlug: null, mobileReadOnly: false, onRefresh: noAction, onRetry: noAction, onAssign: noAction,
        onClear: noAction, onIssueOwnershipInvite: noAction, onDeleteAccount: noAction,
        routes: buildAppRoutes('production'), experience: false,
      })))));
const assignmentSelect = accountMarkup.match(/(<select[^>]*>)(?:(?!<\/select>)[\s\S])*?<option value=""[^>]*>연결할 이벤트 선택/)?.[1];
assert.ok(assignmentSelect);
assert.match(assignmentSelect, /disabled=""/, 'an in-flight connection must lock event selection even when the selected target differs');
const accountsSource = ts.createSourceFile('accounts.tsx', readFileSync('src/app/admin/_components/AdminCustomerAccountsTab.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let inviteDisabledExpression: ts.Expression | undefined;
const findInviteAction = (node: ts.Node) => {
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(accountsSource) === 'button') {
    const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
    const onClick = attributes.find((attribute) => attribute.name.getText(accountsSource) === 'onClick');
    if (onClick?.initializer?.getText(accountsSource).includes('onIssueOwnershipInvite(selectedSlug)')) {
      const disabled = attributes.find((attribute) => attribute.name.getText(accountsSource) === 'disabled');
      if (disabled?.initializer && ts.isJsxExpression(disabled.initializer)) inviteDisabledExpression = disabled.initializer.expression;
    }
  }
  ts.forEachChild(node, findInviteAction);
};
findInviteAction(accountsSource);
assert.ok(inviteDisabledExpression);
const evaluateInviteDisabled = (customerBusy: boolean) => runInNewContext(`(${inviteDisabledExpression.getText(accountsSource)})`, {
  customerBusy, selectedSlug: 'event-two', filteredAssignableEvents: [{ slug: 'event-two' }], isIssuingSelectedInvite: false,
});
assert.equal(evaluateInviteDisabled(true), true, 'link issuance must remain locked during another customer action even with a valid target');
assert.equal(evaluateInviteDisabled(false), false, 'link issuance must become available when customer operations finish');
client.clear();
console.log('관리자 조회 복구·상태 잠금 검증 통과');
