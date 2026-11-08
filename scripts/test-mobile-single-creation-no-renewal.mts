import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  INVITATION_PREMIUM_PRICE_KRW,
  INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS,
  LEGACY_MOBILE_PURCHASE_CUTOFF_UTC,
  isLegacyMobilePurchaseDate,
} from '../src/lib/invitationProductPolicy.ts';

const read = (name: string) => readFileSync(name, 'utf8');
const linked = read('apps/mobile/src/features/manage/components/LinkedInvitationsSection.tsx');
const manage = read('apps/mobile/src/features/screens/manage.tsx');
const hook = read('apps/mobile/src/features/manage/hooks/usePeriodExtensionPurchase.ts');
const modal = read('apps/mobile/src/features/manage/components/PeriodExtensionModal.tsx');
const api = read('src/app/api/mobile/billing/fulfill/route.ts');
const service = read('src/server/mobileBillingServerService.ts');
const settings = read('apps/mobile/src/features/screens/settings.tsx');
const guide = read('apps/mobile/src/constants/content.ts');

assert.equal(INVITATION_PREMIUM_PRICE_KRW, 5000);
assert.equal(INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS, 6);
assert.equal(LEGACY_MOBILE_PURCHASE_CUTOFF_UTC, '2026-11-09T00:00:00.000Z');
assert.equal(isLegacyMobilePurchaseDate('2026-11-08T23:59:59Z'), true);
assert.equal(isLegacyMobilePurchaseDate('2026-11-09T00:00:00Z'), false);
assert.equal(isLegacyMobilePurchaseDate('2026-11-09T00:01:00Z'), false);
assert.equal(isLegacyMobilePurchaseDate(null), false);
assert.equal(isLegacyMobilePurchaseDate('unknown'), false);

assert.doesNotMatch(linked, /5,000원 · 6개월 연장|onOpenPeriodExtension/);
assert.match(linked, /pendingExtensionSlug === activeLinkedInvitationCard.slug/);
assert.match(linked, /이전 결제 복구/);
assert.doesNotMatch(manage, /onPurchase=|handlePurchaseExtension|onOpenPeriodExtension=/);
assert.match(manage, /onRecoverPendingPurchase=\{openExtensionModal\}/);
assert.doesNotMatch(hook, /purchaseBillingProduct|runPendingBillingPurchase|handlePurchaseExtension/);
assert.match(hook, /recoverPendingBillingPurchase/);
assert.match(hook, /fulfillMobileBillingPeriodExtension/);
assert.match(hook, /fulfillMobileBillingTicketPack/);
assert.match(modal, /title="이전 결제 복구"/);
assert.doesNotMatch(modal, /onPurchase|5,000원 결제로 6개월 연장|INVITATION_EXTENSION_PRICE_KRW/);
assert.match(modal, /추가 결제 없이 이전 거래만 복구/);
assert.doesNotMatch(settings, /연장도 5,000원에 6개월|처음 만들기부터 기간 연장/);
assert.doesNotMatch(guide, /이용 기간 연장은 내 청첩장에서 Google Play/);

assert.match(api, /if \(action === 'createInvitationPage'\)/);
assert.match(api, /if \(action === 'extendInvitationPeriod'\)/);
assert.match(api, /if \(action === 'grantTicketPack'\)/);
assert.match(service, /function assertLegacyPaidTransactionDate\(purchaseDate: string \| null\)/);
assert.equal((service.match(/assertLegacyPaidTransactionDate\(verifiedTransaction\.purchaseDate\)/g) ?? []).length, 2);
assert.match(service, /verifiedTransaction = await verifyGooglePlayOneTimePurchase\(purchase, \{ allowConsumed: true \}\)/);
assert.match(service, /code: 'billing-fulfillment-requires-review'/);
assert.match(api, /error\.code === 'billing-fulfillment-requires-review'/);

console.log('Single 5,000 KRW / six-month creation, no new renewals, legacy paid receipt recovery policy passed');
