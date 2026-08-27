import assert from 'node:assert/strict';

import {
  getInvitationPublicAccessState,
  shouldRunClientInvitationPageQuery,
} from '@/lib/invitationPublicAccess';

const now = new Date('2026-04-30T12:00:00+09:00');

const deletingAccess = getInvitationPublicAccessState({
  published: true,
  displayPeriodEnabled: false,
  displayPeriodStart: null,
  displayPeriodEnd: null,
  deletion: {
    jobId: 'private-deletion-job',
    status: 'running',
    currentStep: 'delete-images',
    requestedAt: '2026-04-30T00:00:00.000Z',
  },
}, now);

assert.equal(
  deletingAccess.isPublic,
  false,
  'deletion in progress must never remain visitor-public'
);
assert.equal(deletingAccess.reason, 'deleting');
assert.equal(
  deletingAccess.visitorMessage,
  '현재 이용할 수 없는 페이지입니다.',
  'visitor responses must not expose deletion job details'
);
assert.equal(
  JSON.stringify(deletingAccess).includes('private-deletion-job'),
  false,
  'public access results must not expose deletion metadata'
);

assert.equal(
  shouldRunClientInvitationPageQuery({
    isAdminLoading: false,
    isAdminLoggedIn: false,
    hasInitialPage: false,
    hasInitialBlockMessage: true,
  }),
  false,
  'a server-blocked visitor must not reopen the event through a client query'
);
assert.equal(
  shouldRunClientInvitationPageQuery({
    isAdminLoading: false,
    isAdminLoggedIn: true,
    hasInitialPage: false,
    hasInitialBlockMessage: true,
  }),
  true,
  'an authenticated administrator may still load a blocked event for recovery'
);

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
