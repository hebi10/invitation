import 'server-only';
import { listRecentVoidedGooglePlayPurchases } from './googlePlayPurchaseVerifier';
import {
  RefundAccessError, validRefundTransactionId, validRefundReleaseReason,
  type RefundAccessReview, type RefundReleaseReason,
} from './refundAccessPolicy';
import { applyRefundAccessChange, listHeldRefundAccessReviews } from './repositories/refundAccessRepository';

export function isRefundAccessHoldEnabled() {
  return process.env.INVITATION_REFUND_ACCESS_REVIEW_ENABLED === 'true';
}
function projectReview(review: RefundAccessReview) {
  return {
    transactionIdentifier: review.transactionIdentifier, pageSlug: review.pageSlug, state: review.state,
    voidedAt: review.voidedAt, heldAt: review.heldAt, releasedAt: review.releasedAt, releaseReason: review.releaseReason,
  };
}
export async function getAdminRefundAccessState() {
  const { truncated, holds } = await listHeldRefundAccessReviews();
  return { holdEnabled: isRefundAccessHoldEnabled(), truncated, holds: holds.map(projectReview) };
}
export async function reviewRefundAccess(input: {
  action: 'hold' | 'release'; id: string; adminUid: string; releaseReason?: RefundReleaseReason;
}, dependencies = { apply: applyRefundAccessChange, list: listRecentVoidedGooglePlayPurchases,
  holdEnabled: isRefundAccessHoldEnabled, now: () => new Date() }) {
  if (!validRefundTransactionId(input.id) || !input.adminUid ||
      (input.action !== 'hold' && input.action !== 'release') ||
      (input.action === 'release' && !validRefundReleaseReason(input.releaseReason))) {
    throw new RefundAccessError(400, '환불 검토 요청을 확인해 주세요.');
  }
  let voidedAt: string | undefined;
  if (input.action === 'hold') {
    if (!dependencies.holdEnabled()) throw new RefundAccessError(409, '환불 이용 보류 기능이 활성화되지 않았습니다.');
    voidedAt = (await dependencies.list()).find(purchase => purchase.transactionIdentifier === input.id)?.voidedAt;
    if (!voidedAt) throw new RefundAccessError(409, '최근 Google Play 환불 기록에서 이 거래를 확인하지 못했습니다.');
  }
  const result = await dependencies.apply({ ...input, voidedAt, now: dependencies.now() });
  return { changed: result.changed, review: projectReview(result.review) };
}
