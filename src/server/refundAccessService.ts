import 'server-only';
import { getServerFirestore } from './firebaseAdmin';
import { listRecentVoidedGooglePlayPurchases } from './googlePlayPurchaseVerifier';
import {
  buildRefundAccessChange, isRefundPageCreationGrant, RefundAccessError,
  REFUND_REVIEW_COLLECTION, validRefundTransactionId, validRefundReleaseReason,
  type RefundAccessReview, type RefundReleaseReason,
} from './refundAccessPolicy';

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
  const db = getServerFirestore();
  if (!db) throw new RefundAccessError(503, '환불 검토 저장소를 확인하지 못했습니다.');
  const snapshot = await db.collection(REFUND_REVIEW_COLLECTION).where('state', '==', 'held').limit(101).get();
  return { holdEnabled: isRefundAccessHoldEnabled(), truncated: snapshot.docs.length > 100,
    holds: snapshot.docs.slice(0, 100).map(doc => projectReview(doc.data() as RefundAccessReview)) };
}
export async function reviewRefundAccess(input: {
  action: 'hold' | 'release'; id: string; adminUid: string; releaseReason?: RefundReleaseReason;
}, dependencies = { db: getServerFirestore, list: listRecentVoidedGooglePlayPurchases,
  holdEnabled: isRefundAccessHoldEnabled, now: () => new Date() }) {
  if (!validRefundTransactionId(input.id) || !input.adminUid ||
      (input.action !== 'hold' && input.action !== 'release') ||
      (input.action === 'release' && !validRefundReleaseReason(input.releaseReason))) {
    throw new RefundAccessError(400, '환불 검토 요청을 확인해 주세요.');
  }
  const db = dependencies.db();
  if (!db) throw new RefundAccessError(503, '환불 검토 저장소를 확인하지 못했습니다.');
  let voidedAt: string | undefined;
  if (input.action === 'hold') {
    if (!dependencies.holdEnabled()) throw new RefundAccessError(409, '환불 이용 보류 기능이 활성화되지 않았습니다.');
    voidedAt = (await dependencies.list()).find(purchase => purchase.transactionIdentifier === input.id)?.voidedAt;
    if (!voidedAt) throw new RefundAccessError(409, '최근 Google Play 환불 기록에서 이 거래를 확인하지 못했습니다.');
  }
  const grantRef = db.collection('billingFulfillments').doc(input.id);
  const reviewRef = db.collection(REFUND_REVIEW_COLLECTION).doc(input.id);
  const result = await db.runTransaction(async transaction => {
    const [grantSnapshot, reviewSnapshot] = await Promise.all([transaction.get(grantRef), transaction.get(reviewRef)]);
    const grant = grantSnapshot.data();
    if (!isRefundPageCreationGrant(grant, input.id) || !grant) throw new RefundAccessError(409, '지원되는 신규 청첩장 지급 기록을 확인하지 못했습니다.');
    const eventRef = db.collection('events').doc(grant.eventId as string);
    const indexRef = db.collection('eventSlugIndex').doc(grant.createdPageSlug as string);
    const [eventSnapshot, indexSnapshot] = await Promise.all([transaction.get(eventRef), transaction.get(indexRef)]);
    const now = dependencies.now();
    const decision = buildRefundAccessChange({
      ...input, grant, event: eventSnapshot.data(), index: indexSnapshot.data(),
      review: reviewSnapshot.exists ? reviewSnapshot.data() as RefundAccessReview : null, voidedAt, now,
    });
    if (decision.changed) {
      const version = eventSnapshot.get('version');
      transaction.update(eventRef, {
        billingAccessHold: input.action === 'hold' ? input.id : null,
        published: false, 'visibility.published': false, publicationReview: null, updatedAt: now,
        version: (typeof version === 'number' && Number.isSafeInteger(version) && version >= 0 ? version : 0) + 1,
      });
      transaction.set(reviewRef, decision.review);
    }
    return decision;
  });
  return { changed: result.changed, review: projectReview(result.review) };
}
