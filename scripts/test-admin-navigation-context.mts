import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import { buildAppRoutes } from '../src/lib/demoExperienceRoutes.ts';
import {
  getAdminWizardReturnHref,
  withAdminWizardReturnTo,
} from '../src/lib/adminWizardNavigation.ts';
import AdminEventDetailPanel from '../src/app/admin/_components/AdminEventDetailPanel.tsx';
import AdminEventList from '../src/app/admin/_components/AdminEventList.tsx';
import { AdminWorkGuardProvider } from '../src/app/admin/_components/AdminWorkGuard.tsx';
import type { InvitationPageSummary } from '../src/services/invitationPageService.ts';

Object.assign(globalThis, { React });
function resolveComponent<T>(component: T): T {
  return (component as T & { default?: T }).default ?? component;
}

const production = buildAppRoutes('production');
const experience = buildAppRoutes('experience');

for (const [eventType, theme, expected] of [
  ['birthday', 'birthday-minimal', '/birthday-minseo-picnic/birthday-minimal'],
  ['birthday', 'birthday-floral', '/birthday-minseo-picnic/birthday-floral'],
  ['first-birthday', 'first-birthday-mint', '/birthday-minseo-picnic/first-birthday-mint'],
  ['opening', 'opening-modern', '/birthday-minseo-picnic/opening-modern'],
  ['general-event', 'general-event-vivid', '/birthday-minseo-picnic/general-event-vivid'],
  ['wedding', 'simple', '/birthday-minseo-picnic/simple'],
] as const) {
  assert.equal(production.preview('birthday-minseo-picnic', theme, eventType), expected);
}
assert.equal(production.preview('sample', 'romantic'), '/sample/romantic');
assert.equal(
  experience.preview('daily-experience-wedding', 'simple', 'wedding'),
  '/experience/preview/daily-experience-wedding/simple'
);

const adminContext = '/admin?section=events&tab=pages&pageQ=test&page=3&pageSize=20&pageSort=name&published=private&event=birthday-minseo-picnic&detail=overview';
const contextualRoutes = withAdminWizardReturnTo(production, adminContext);
const editUrl = new URL(contextualRoutes.wizardEdit('birthday-minseo-picnic'), 'https://invitation.test');
assert.equal(editUrl.pathname, '/page-wizard/birthday-minseo-picnic');
assert.equal(editUrl.searchParams.get('returnTo'), adminContext);
assert.equal(getAdminWizardReturnHref(editUrl.searchParams.get('returnTo'), production), adminContext);
assert.equal(contextualRoutes.customerDashboard(), '/my-invitations');
const resultUrl = new URL(contextualRoutes.wizardResult('birthday-minseo-picnic'), 'https://invitation.test');
assert.equal(resultUrl.pathname, '/page-wizard/birthday-minseo-picnic/result');
assert.equal(resultUrl.searchParams.get('returnTo'), adminContext);

const experienceContext = '/experience/admin?pageQ=sample&page=2&pageSort=event-date&event=daily-experience-wedding';
const experienceEditUrl = new URL(withAdminWizardReturnTo(experience, experienceContext).wizardEdit('daily-experience-wedding'), 'https://invitation.test');
assert.equal(experienceEditUrl.pathname, '/experience/page-wizard/daily-experience-wedding');
assert.equal(getAdminWizardReturnHref(experienceEditUrl.searchParams.get('returnTo'), experience), experienceContext);
assert.equal(getAdminWizardReturnHref(adminContext, experience), '/experience/admin');
assert.equal(getAdminWizardReturnHref(experienceContext, production), '/admin');
assert.equal(getAdminWizardReturnHref(null, production), '/admin');
assert.equal(getAdminWizardReturnHref('/admin/?pageQ=test&page=3&pageSort=name&event=sample', production), '/admin?pageQ=test&page=3&pageSort=name&event=sample');
assert.equal(getAdminWizardReturnHref('/experience/admin/?pageQ=sample&page=2&event=daily-experience-wedding', experience), '/experience/admin?pageQ=sample&page=2&event=daily-experience-wedding');
assert.equal(getAdminWizardReturnHref('/admin/', experience), '/experience/admin');
assert.equal(getAdminWizardReturnHref('/experience/admin/', production), '/admin');
const trailingSlashEdit = new URL(withAdminWizardReturnTo(production, '/admin/?pageQ=test&page=3').wizardEdit('sample'), 'https://invitation.test');
assert.equal(trailingSlashEdit.searchParams.get('returnTo'), '/admin?pageQ=test&page=3');
assert.equal(getAdminWizardReturnHref('/admin?pageQ=%ED%95%B4%EB%B9%84+%EC%B4%88%EB%8C%80', production), '/admin?pageQ=%ED%95%B4%EB%B9%84+%EC%B4%88%EB%8C%80');

for (const unsafePath of [
  'https://evil.example/admin?pageQ=test',
  '//evil.example/admin',
  '/\\evil.example/admin',
  'javascript:alert(1)',
  '/admin.example?pageQ=test',
  '/admin/elsewhere?pageQ=test',
  '/admin//?pageQ=test',
  '/admin/%2f?pageQ=test',
  '/admin/../my-invitations',
  '/admin%2f..%2fmy-invitations',
  '/my-invitations?pageQ=test',
  '\n/admin?pageQ=test',
]) {
  assert.equal(getAdminWizardReturnHref(unsafePath, production), '/admin', unsafePath);
}
assert.equal(
  getAdminWizardReturnHref('/admin?pageQ=test&next=%2F%2Fevil.example&returnTo=%2F%2Fevil.example#https://evil.example', production),
  '/admin?pageQ=test',
  'only administrator screen state is restored; redirect instructions are discarded'
);

const noAction = () => {};
const birthdayPage: InvitationPageSummary = {
  slug: 'birthday-minseo-picnic', eventType: 'birthday', displayName: '민서 생일',
  description: '', date: '2026-10-25', venue: '서울', createdAt: null, updatedAt: null,
  published: false, defaultTheme: 'birthday-minimal', productTier: 'standard',
  features: { maxGalleryImages: 10, shareMode: 'link', showMusic: false, showCountdown: true, showGuestbook: true },
  displayPeriodEnabled: false, displayPeriodStart: null, displayPeriodEnd: null,
  variants: {}, dataSource: 'firestore', hasCustomConfig: true, ownershipKind: 'unassigned',
};
const detailMarkup = renderToStaticMarkup(React.createElement(resolveComponent(AdminWorkGuardProvider), null,
  React.createElement(resolveComponent(AdminEventDetailPanel), {
    page: birthdayPage, eventError: null, eventRefreshing: false, selectedDetailTab: 'overview', mobileReadOnly: false,
    onDetailTabChange: noAction, onNavigate: noAction, updatingPublished: false, updatingTier: false,
    updatingVariantToken: null, deleting: false, issuingInvite: false, comments: [], commentsLoading: false,
    commentsRefreshing: false, commentsError: null, customerAccounts: [], accountsLoading: false, accountsError: null,
    ownershipActionToken: null, onClose: noAction, onTogglePublished: noAction, onChangeTier: noAction,
    onEnableVariant: noAction, onDisableVariant: noAction, onRefreshEvent: noAction, onRefreshComments: noAction,
    onRefreshAccounts: noAction, onDeleteComment: noAction, onAssignCustomerOwnership: noAction,
    onClearCustomerOwnership: noAction, onIssueOwnershipInvite: noAction, onDelete: noAction,
    routes: contextualRoutes, experience: false,
  })));
const renderedPreviewPaths = [...detailMarkup.matchAll(/<a[^>]+href="([^"]+)"[^>]*>\s*미리보기\s*<\/a>/g)].map((match) => match[1]);
assert.deepEqual(renderedPreviewPaths, [
  '/birthday-minseo-picnic/birthday-minimal',
  '/birthday-minseo-picnic/birthday-minimal',
], 'both detail preview actions must use the event type');
const listMarkup = renderToStaticMarkup(React.createElement(resolveComponent(AdminEventList), {
  pages: [birthdayPage], selectedSlug: birthdayPage.slug, onSelect: noAction, routes: contextualRoutes, experience: false,
}));
for (const markup of [detailMarkup, listMarkup]) {
  const editHref = markup.match(/<a[^>]+href="([^"]+)"[^>]*>\s*편집\s*<\/a>/)?.[1];
  assert.ok(editHref, 'the administrator edit action must be available');
  const renderedEditUrl = new URL(editHref.replaceAll('&amp;', '&'), 'https://invitation.test');
  assert.equal(renderedEditUrl.searchParams.get('returnTo'), adminContext);
}

// Execute the real click handler to cover its administrator/customer branch without mocking the editor.
const wizardSource = ts.createSourceFile('PageWizardClient.tsx', readFileSync('src/app/page-wizard/PageWizardClient.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let returnHandler: ts.Expression | undefined;
let completionHandler: ts.Expression | undefined;
function findReturnHandler(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(wizardSource) === 'handleReturnToList') returnHandler = node.initializer;
  if (ts.isPropertyAssignment(node) && node.name.getText(wizardSource) === 'onComplete') completionHandler = node.initializer;
  ts.forEachChild(node, findReturnHandler);
}
findReturnHandler(wizardSource);
assert.ok(returnHandler);
function returnFromWizard(isAdminLoggedIn: boolean, routes = production, returnTo = adminContext) {
  const destinations: string[] = [];
  const handler = runInNewContext(`(${returnHandler!.getText(wizardSource)})`, {
    isSaving: false, uploadingField: null, isConnectingCustomer: false,
    reloadInFlightRef: { current: false }, hasUnsavedChanges: false, isAdminLoggedIn,
    router: { push: (destination: string) => destinations.push(destination) },
    searchParams: new URLSearchParams({ returnTo }), routes, getAdminWizardReturnHref,
  });
  handler();
  return destinations;
}
assert.deepEqual(returnFromWizard(true), [adminContext]);
assert.deepEqual(returnFromWizard(false), ['/my-invitations']);
assert.deepEqual(returnFromWizard(true, experience, experienceContext), [experienceContext]);
assert.deepEqual(returnFromWizard(false, experience, experienceContext), ['/experience/my-invitations']);
assert.deepEqual(returnFromWizard(true, production, '//evil.example'), ['/admin']);
assert.ok(completionHandler);
function completeWizard(isAdminLoggedIn: boolean, routes = production, returnTo = adminContext) {
  const destinations: string[] = [];
  const emitted = ts.transpileModule(`const complete = ${completionHandler!.getText(wizardSource)}; complete;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const complete = runInNewContext(emitted, {
    router: { push: (destination: string) => destinations.push(destination) },
    searchParams: new URLSearchParams({ returnTo }), isAdminLoggedIn, routes, withAdminWizardReturnTo,
  });
  complete('birthday-minseo-picnic');
  return destinations;
}
const savedResultUrl = new URL(completeWizard(true)[0], 'https://invitation.test');
assert.equal(savedResultUrl.pathname, '/page-wizard/birthday-minseo-picnic/result');
assert.equal(savedResultUrl.searchParams.get('returnTo'), adminContext, 'successful save completion must carry the administrator context to the result');
assert.deepEqual(completeWizard(false), ['/page-wizard/birthday-minseo-picnic/result']);
const experienceResultUrl = new URL(completeWizard(true, experience, experienceContext)[0], 'https://invitation.test');
assert.equal(experienceResultUrl.pathname, '/experience/page-wizard/birthday-minseo-picnic/result');
assert.equal(experienceResultUrl.searchParams.get('returnTo'), experienceContext);

console.log('admin navigation context checks passed');
