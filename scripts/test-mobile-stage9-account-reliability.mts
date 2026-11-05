import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createOwnedInvitationListRequestGate } from '../apps/mobile/src/lib/ownedInvitationListRequestGate';
import { getInvitationVisibility } from '../apps/mobile/src/features/manage/invitationVisibility';

const read = (filename: string) => readFileSync(filename, 'utf8');

const gate = createOwnedInvitationListRequestGate();
const first = gate.begin('owner-a');
assert.equal(gate.isCurrent(first, 'owner-a'), true);
assert.equal(gate.isCurrent(first, 'owner-b'), false);
const second = gate.begin('owner-a');
assert.equal(gate.isCurrent(first, 'owner-a'), false, 'An earlier refresh must be obsolete');
assert.equal(gate.isCurrent(second, 'owner-a'), true);
gate.invalidate();
assert.equal(gate.isCurrent(second, 'owner-a'), false, 'Blur or logout must invalidate in-flight reads');
const switched = gate.begin('owner-b');
assert.equal(gate.isCurrent(switched, 'owner-a'), false);
assert.equal(gate.isCurrent(switched, 'owner-b'), true);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const firstLoad = deferred<string>();
const secondLoad = deferred<string>();
const asyncGate = createOwnedInvitationListRequestGate();
const firstTicket = asyncGate.begin('owner-a');
const oldResult = firstLoad.promise.then(value => asyncGate.isCurrent(firstTicket, 'owner-b') ? value : null);
const secondTicket = asyncGate.begin('owner-b');
const freshResult = secondLoad.promise.then(value => asyncGate.isCurrent(secondTicket, 'owner-b') ? value : null);
secondLoad.resolve('newer');
assert.equal(await freshResult, 'newer');
firstLoad.resolve('older');
assert.equal(await oldResult, null, 'Late owner A data cannot overwrite owner B');
asyncGate.invalidate();
assert.equal(asyncGate.isCurrent(secondTicket, 'owner-b'), false);

const period = { enabled: true, startDate: '2024-01-01T00:00:00+09:00', endDate: '2024-12-31T23:59:59+09:00' };
const now = Date.parse('2026-11-05T20:00:00+09:00');
assert.equal(getInvitationVisibility(true, period, now).label, '노출 종료');
assert.equal(getInvitationVisibility(false, period, now).label, '비공개');
assert.equal(getInvitationVisibility(true, { ...period, startDate: '2027-01-01T00:00:00+09:00', endDate: '2027-12-31T23:59:59+09:00' }, now).label, '노출 시작 전');

const account = read('apps/mobile/src/components/AccountInvitationsSection.tsx');
const recent = read('apps/mobile/src/features/login/components/RecentLinkedInvitationsSection.tsx');
const login = read('apps/mobile/src/app/login.tsx');
const capture = read('scripts/capture-mobile-android.py');
const fixtureA = read('scripts/fixtures/mobile-account-login-capture.tsx.fixture');
const fixtureB = read('scripts/fixtures/mobile-recent-status-capture.tsx.fixture');

assert.match(account, /createOwnedInvitationListRequestGate/);
assert.match(account, /loadGateRef\.current\.begin\(ownerUid\)/);
assert.match(account, /loadGateRef\.current\.isCurrent\(request, activeCustomerUidRef\.current\)/);
assert.match(account, /return \(\) => \{ loadGateRef\.current\.invalidate\(\); \}/);
assert.match(account, /const signOut = async \(\) => \{/);
assert.match(account, /await logoutCustomer\(\)/);
assert.match(account, /listMobileCustomerInvitations\(apiBaseUrl, token\)/);
assert.match(account, /<AccountHelpLinks \/>/);
assert.match(account, /catch \{\s*setError\('청첩장을 열지 못했습니다/);
assert.doesNotMatch(account, /refreshAccountList\(\(\) => false\)/, 'Uncancellable manual refresh is forbidden');
assert.doesNotMatch(account, /slice\(0, 8\)|MAX_LINKED_INVITATION_CARD_COUNT/);

assert.match(recent, /getInvitationVisibility\(card\.published, card\.displayPeriod\)/);
assert.match(recent, /공개 상태: \{visibility\.label\}/);
assert.match(recent, /Boolean\(activatingSlug\) \|\| !hasPublicUrl/);
assert.match(login, /const address = card\.publicUrl\?\.trim\(\);/);
assert.doesNotMatch(login, /card\.publicUrl\?\.trim\(\) \|\| card\.slug/);
assert.match(login, /recentCardsLoadFailed/);
assert.match(login, /연동 기록 다시 불러오기/);
assert.match(fixtureA, /<AccountInvitationsSection \/>/);
assert.match(fixtureB, /<RecentLinkedInvitationsSection/);
for (const name of ['account-sign-in', 'recent-linked-status']) {
  assert.ok(capture.includes(`'${name}'`), `Android capture missing ${name}`);
}
console.log('Mobile stage 9 account requests, recent visibility and recovery UI checks passed');
