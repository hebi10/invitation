import assert from 'node:assert/strict';
import * as purchase from '../src/features/create/shared';

assert.deepEqual(purchase.CREATE_STEPS.map((step) => step.key), ['info', 'selection', 'review'],
  '서비스 생성 결제에는 별도로 결제되지 않는 추가 티켓 단계가 없어야 합니다.');

for (const ticketCount of [0, 1, 5, 10, 99]) {
  const legacyDraft = { servicePlan: 'standard' as const, ticketCount, estimatedPrice: 999999 };
  assert.deepEqual(purchase.getCreatePurchaseSummary(legacyDraft), { ticketCount: 0, estimatedPrice: 5000 },
    '이전 초안의 추가 티켓과 과거 예상 금액은 현재 생성 결제에 포함되지 않아야 합니다.');
}

assert.deepEqual(purchase.getCreatePurchaseSummary({ servicePlan: 'premium' }),
  { ticketCount: 0, estimatedPrice: 15000 }, '선택한 서비스의 생성 상품 금액을 표시해야 합니다.');

console.log('mobile purchase summary tests passed');
