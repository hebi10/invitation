import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getOwnedInvitationStatus } from '../apps/mobile/src/features/manage/ownedInvitationPresentation';
import { getInvitationVisibility } from '../apps/mobile/src/features/manage/invitationVisibility';

const read = (path: string) => readFileSync(path, 'utf8');

assert.deepEqual(getOwnedInvitationStatus({ published: false }), {
  label: '비공개',
  tone: 'neutral',
});
assert.deepEqual(getOwnedInvitationStatus({ published: true }), {
  label: '공개 설정',
  tone: 'neutral',
});
assert.deepEqual(getOwnedInvitationStatus({
  published: true,
  publicAccess: { isPublic: false, adminLabel: '노출 시작 전' },
}), { label: '노출 시작 전', tone: 'notice' });
assert.deepEqual(getOwnedInvitationStatus({
  published: true,
  publicAccess: { isPublic: true, adminLabel: '공개 중' },
}), { label: '공개 중', tone: 'success' });
assert.deepEqual(getOwnedInvitationStatus({
  published: false,
  publicAccess: { isPublic: false, adminLabel: '비공개' },
}), { label: '비공개', tone: 'neutral' });

const referenceTime = Date.parse('2026-11-05T15:00:00+09:00');
const activePeriod = {
  enabled: true,
  startDate: '2026-01-01T00:00:00+09:00',
  endDate: '2027-12-31T23:59:59+09:00',
};
assert.equal(getInvitationVisibility(true, activePeriod, referenceTime).label, '공개 중');
assert.equal(getInvitationVisibility(false, activePeriod, referenceTime).label, '비공개');
assert.equal(getInvitationVisibility(true, {
  ...activePeriod,
  startDate: '2027-01-01T00:00:00+09:00',
}, referenceTime).label, '노출 시작 전');

const summary = read('apps/mobile/src/components/InvitationSummaryCard.tsx');
const account = read('apps/mobile/src/components/AccountInvitationsSection.tsx');
const linked = read('apps/mobile/src/features/manage/components/LinkedInvitationsSection.tsx');
const drafts = read('apps/mobile/src/components/DraftInvitationsSection.tsx');
const manage = read('apps/mobile/src/features/screens/manage.tsx');
const capture = read('scripts/capture-mobile-android.py');

assert.match(summary, /themePreviewImages\[themeKey\] \?\? themePreviewImages\.simple/);
assert.match(summary, /borderColor: selected \? palette\.accent : palette\.cardBorder/);
assert.match(summary, /styles\.headingRow/);
assert.match(summary, /periodLabel \? \(/);
assert.match(summary, /statusTone === 'notice' \? palette\.noticeSoft/);
assert.match(summary, /coverImageUrl|imageUrl/);
assert.match(account, /<InvitationSummaryCard/);
assert.match(account, /getOwnedInvitationStatus\(item\)/);
assert.match(account, /listMobileCustomerInvitations\(apiBaseUrl, token\)/);
assert.doesNotMatch(account, /MAX_LINKED_INVITATION_CARD_COUNT|slice\(0, 8\)/);
assert.match(account, /onOpen\(item\.slug\)/);
assert.match(account, /managementAction=\{\(/);
assert.match(account, /공유 설정/);
assert.match(account, /사용 가능한 디자인 · \{item\.availableThemes\.length\}종/);
assert.match(account, /새로 만들기/);
assert.match(account, /목록 다시 불러오기/);
assert.match(account, /계정에 등록된 청첩장이 없습니다/);
assert.match(linked, /<InvitationSummaryCard/);
assert.match(linked, /getInvitationVisibility\(published, card\.displayPeriod\)/);
assert.match(linked, /onOpenEditor/);
assert.match(linked, /onKakaoShare\(activeLinkedInvitationCard\)/);
assert.match(linked, /onActivateLinkedInvitation\(item\)/);
assert.match(linked, /onOpenPeriodExtension/);
assert.match(linked, /onOpenGuestbook/);
assert.match(linked, /title="기기 연동 청첩장"/);
assert.match(linked, /이용 기간 ·/);
assert.match(linked, /카카오톡 카드 공유/);
assert.match(linked, /현재 관리 정보를 확인하고 있습니다/);
assert.match(drafts, /borderWidth: 1/);
assert.doesNotMatch(drafts, /borderTopWidth/);
assert.match(manage, /이 기기에 연결된 청첩장이 없습니다/);
assert.match(manage, /customerSession\?\.uid \? <AccountInvitationsSection \/>/);
assert.match(manage, /title="마이페이지"/);
assert.match(capture, /linked-list/);
assert.match(capture, /design-check-linked/);

console.log('Mobile stage 3 invitation list and status presentation tests passed');
