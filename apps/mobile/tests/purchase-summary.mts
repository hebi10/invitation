import assert from 'node:assert/strict';
import * as purchase from '../src/features/create/shared';
import * as billing from '../../../src/lib/mobileBillingProducts';
import * as content from '../src/constants/content';
import * as deepLink from '../src/lib/appDeepLink';

assert.ok(content.servicePlans[0].features.includes('기본 노출 기간 4개월'));
assert.deepEqual(content.ticketActions.map((action) => action.key), ['extend']);
for (const intent of ['upgrade', 'extra-page', 'extra-variant']) {
  assert.deepEqual(deepLink.resolveAppDeepLink(`mobileinvitation://create?ticketIntent=${intent}`),
    { type: 'route', href: '/create' }, '폐지된 티켓 기능은 딥링크로 실행되지 않아야 합니다.');
}
assert.deepEqual(deepLink.resolveAppDeepLink('mobileinvitation://create?ticketIntent=extend'),
  { type: 'route', href: { pathname: '/create', params: { ticketIntent: 'extend' } } });

assert.deepEqual(purchase.CREATE_STEPS.map((step) => step.key), ['info', 'selection', 'review'],
  '서비스 생성 결제에는 별도로 결제되지 않는 추가 티켓 단계가 없어야 합니다.');

for (const ticketCount of [0, 1, 5, 10, 99]) {
  const legacyDraft = { servicePlan: 'standard' as const, ticketCount, estimatedPrice: 999999 };
  assert.deepEqual(purchase.getCreatePurchaseSummary(legacyDraft), { ticketCount: 0, estimatedPrice: 9900 },
    '이전 초안의 추가 티켓과 과거 예상 금액은 현재 생성 결제에 포함되지 않아야 합니다.');
}

assert.deepEqual(purchase.getCreatePurchaseSummary({ servicePlan: 'premium' }),
  { ticketCount: 0, estimatedPrice: 9900 }, '선택한 서비스의 생성 상품 금액을 표시해야 합니다.');

console.log('mobile purchase summary tests passed');

assert.equal(purchase.servicePlans.length, 1);
assert.equal(purchase.servicePlans[0].tier, 'premium');
assert.deepEqual(billing.MOBILE_BILLING_PAGE_CREATION_PRODUCT_IDS, ['page_creation_premium']);
assert.equal(billing.getMobileBillingPageCreationProductId('standard'), 'page_creation_premium');
assert.equal(billing.getMobileBillingPageCreationProductId('deluxe'), 'page_creation_premium');
assert.equal(billing.isMobileBillingProductId('page_creation_standard'), true, '기존 결제 영수증은 계속 검증할 수 있어야 합니다.');
