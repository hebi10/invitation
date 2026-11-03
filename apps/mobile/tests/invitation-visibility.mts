import assert from 'node:assert/strict';

import { getInvitationVisibility } from '../src/features/manage/invitationVisibility';

const now = Date.parse('2026-11-03T12:00:00Z');
const period = {
  enabled: true,
  startDate: '2026-11-01T12:00:00Z',
  endDate: '2026-11-30T12:00:00Z',
};

assert.equal(getInvitationVisibility(false, period, now).label, '비공개');
assert.equal(getInvitationVisibility(true, { ...period, enabled: false }, now).label, '공개 중');
assert.equal(getInvitationVisibility(true, period, now).label, '공개 중');
assert.equal(getInvitationVisibility(true, period, Date.parse(period.startDate)).isPublic, true,
  '노출 시작 시각부터 하객이 열 수 있어야 합니다.');
assert.equal(getInvitationVisibility(true, period, Date.parse(period.endDate)).isPublic, true,
  '노출 종료 시각까지 하객이 열 수 있어야 합니다.');
assert.equal(getInvitationVisibility(true, period, Date.parse(period.startDate) - 1).label, '노출 시작 전');
assert.equal(getInvitationVisibility(true, period, Date.parse(period.endDate) + 1).label, '노출 종료');
for (const incompletePeriod of [
  { ...period, startDate: null },
  { ...period, endDate: null },
  { ...period, startDate: 'invalid' },
]) {
  assert.equal(getInvitationVisibility(true, incompletePeriod, now).label, '노출 기간 확인 필요');
  assert.equal(getInvitationVisibility(true, incompletePeriod, now).isPublic, false);
}

console.log('mobile invitation visibility tests passed');
