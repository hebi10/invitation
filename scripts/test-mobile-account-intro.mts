import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { WEDDING_INTRO_OPTIONS, normalizeWeddingIntroStyle } from '../src/lib/weddingIntro.ts';
import { canOpenOwnedWeddingPage } from '../src/lib/mobileAccountOwnership.ts';
import { EMPTY_FORM, buildManageFormFromDashboard } from '../apps/mobile/src/features/manage/shared.ts';
import { buildConfigFromForm } from '../apps/mobile/src/features/manage/buildConfigFromForm.ts';
import type { MobileInvitationDashboard } from '../apps/mobile/src/types/mobileInvitation.ts';

const styles = ['none', 'light', 'cinema', 'envelope'] as const;
assert.deepEqual(WEDDING_INTRO_OPTIONS.map((item) => item.value), styles);
assert.equal(normalizeWeddingIntroStyle('invalid-style'), 'none');

const pageConfig = {
  slug: 'test-wedding',
  displayName: '두 사람의 청첩장',
  description: '소중한 분들께',
  date: '2027년 4월 17일',
  venue: '웨딩홀',
  groomName: '김도윤',
  brideName: '이서연',
  couple: { groom: { name: '김도윤' }, bride: { name: '이서연' } },
  pageData: {},
  metadata: { title: '청첩장', description: '초대합니다', images: {} },
  musicEnabled: false,
};
const dashboard = {
  page: {
    slug: pageConfig.slug,
    config: pageConfig,
    features: { showMusic: true, maxGalleryImages: 18 },
    published: false,
    defaultTheme: 'simple',
  },
} as unknown as MobileInvitationDashboard;

for (const introStyle of styles) {
  const draft = {
    ...EMPTY_FORM,
    introStyle,
    groom: { ...EMPTY_FORM.groom, name: '김도윤' },
    bride: { ...EMPTY_FORM.bride, name: '이서연' },
  };
  const saved = buildConfigFromForm({ dashboard, form: draft });
  assert.equal(saved.introStyle, introStyle, 'Android editor must submit selected PC animation');
  const readBack = buildManageFormFromDashboard({
    ...dashboard,
    page: { ...dashboard.page, config: saved },
  });
  assert.equal(readBack.introStyle, introStyle, 'Reload must restore persisted animation');
}
assert.equal(buildManageFormFromDashboard(dashboard).introStyle, 'none');

const owned = { status: 'owner', summary: { slug: 'my-wedding', eventType: 'wedding' } };
assert.equal(canOpenOwnedWeddingPage(owned, 'my-wedding'), true);
for (const status of ['claimable', 'missing', 'different-owner', 'unavailable']) {
  assert.equal(canOpenOwnedWeddingPage({ ...owned, status }, 'my-wedding'), false);
}
assert.equal(canOpenOwnedWeddingPage(owned, 'other-wedding'), false);
assert.equal(canOpenOwnedWeddingPage({ status: 'owner', summary: { slug: 'my-wedding', eventType: 'birthday' } }, 'my-wedding'), false);
assert.equal(canOpenOwnedWeddingPage({ status: 'owner', summary: null }, 'my-wedding'), false);

const route = readFileSync('src/app/api/mobile/client-editor/accounts/activate/route.ts', 'utf8');
assert.match(route, /verifyCustomerRequest\(request, \{ requireVerified: true \}\)/);
assert.match(route, /getCustomerEventOwnershipSnapshot\(customer\.uid, slug\)/);
assert.match(route, /canOpenOwnedWeddingPage\(ownership, slug\)/);
assert.match(route, /readMobileClientEditorDeviceId\(request\)/);
const list = readFileSync('apps/mobile/src/components/AccountInvitationsSection.tsx', 'utf8');
assert.match(list, /listMobileCustomerInvitations\(apiBaseUrl, token\)/);
assert.doesNotMatch(list, /MAX_LINKED_INVITATION_CARD_COUNT|slice\(0, 8\)/);
console.log('Mobile PC intro parity, saved roundtrip, verified owner-only account restore and unlimited account list passed');
