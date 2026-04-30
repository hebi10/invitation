import assert from 'node:assert/strict';

import { getInvitationPublicAccessState } from '@/lib/invitationPublicAccess';

const now = new Date('2026-04-30T12:00:00+09:00');

assert.equal(
  getInvitationPublicAccessState({
    published: false,
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
  }, now).visitorMessage,
  '비공개 페이지입니다.'
);

assert.equal(
  getInvitationPublicAccessState({
    published: true,
    displayPeriodEnabled: true,
    displayPeriodStart: null,
    displayPeriodEnd: null,
  }, now).visitorMessage,
  '노출 기간이 아직 설정되지 않은 페이지입니다.'
);

assert.match(
  getInvitationPublicAccessState({
    published: true,
    displayPeriodEnabled: true,
    displayPeriodStart: new Date('2026-05-01T10:00:00+09:00'),
    displayPeriodEnd: new Date('2026-05-30T10:00:00+09:00'),
  }, now).visitorMessage ?? '',
  /^아직 노출 기간이 시작되지 않은 페이지입니다\./
);

assert.match(
  getInvitationPublicAccessState({
    published: true,
    displayPeriodEnabled: true,
    displayPeriodStart: new Date('2026-04-01T10:00:00+09:00'),
    displayPeriodEnd: new Date('2026-04-20T10:00:00+09:00'),
  }, now).visitorMessage ?? '',
  /^노출 기간이 지난 페이지입니다\./
);

assert.equal(
  getInvitationPublicAccessState({
    published: true,
    displayPeriodEnabled: false,
    displayPeriodStart: null,
    displayPeriodEnd: null,
  }, now).visitorMessage,
  null
);

console.log('public access block reason checks passed');
