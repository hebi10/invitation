import 'server-only';

import { getServerFirestore } from '../firebaseAdmin';
import { buildRefundAccessChange, isRefundPageCreationGrant, RefundAccessError,
  REFUND_REVIEW_COLLECTION, type RefundAccessReview, type RefundReleaseReason } from '../refundAccessPolicy';

export interface RefundAccessWriteInput {
  action: 'hold' | 'release';
  id: string;
  adminUid: string;
  releaseReason?: RefundReleaseReason;
  voidedAt?: string;
  now: Date;
}

export async function listHeldRefundAccessReviews(db = getServerFirestore()) {
  if (!db) throw new RefundAccessError(503, '환불 검토 저장소를 확인하지 못했습니다.');
  const snapshot = await db.collection(REFUND_REVIEW_COLLECTION).where('state', '==', 'held').limit(101).get();
  return { truncated: snapshot.docs.length > 100, holds: snapshot.docs.slice(0, 100).map(doc => doc.data() as RefundAccessReview) };
}

export async function applyRefundAccessChange(input: RefundAccessWriteInput, db = getServerFirestore()) {
  if (!db) throw new RefundAccessError(503, '환불 검토 저장소를 확인하지 못했습니다.');
  const grantRef = db.collection('billingFulfillments').doc(input.id);
  const reviewRef = db.collection(REFUND_REVIEW_COLLECTION).doc(input.id);
  const result = await db.runTransaction(async transaction => {
    const [grantSnapshot, reviewSnapshot] = await Promise.all([transaction.get(grantRef), transaction.get(reviewRef)]);
    const grant = grantSnapshot.data();
    if (!isRefundPageCreationGrant(grant, input.id) || !grant) throw new RefundAccessError(409, '지원되는 신규 청첩장 지급 기록을 확인하지 못했습니다.');
    const eventRef = db.collection('events').doc(grant.eventId as string);
    const indexRef = db.collection('eventSlugIndex').doc(grant.createdPageSlug as string);
    const [eventSnapshot, indexSnapshot] = await Promise.all([transaction.get(eventRef), transaction.get(indexRef)]);
    const now = input.now;
    const decision = buildRefundAccessChange({
      ...input, grant, event: eventSnapshot.data(), index: indexSnapshot.data(),
      review: reviewSnapshot.exists ? reviewSnapshot.data() as RefundAccessReview : null, voidedAt: input.voidedAt, now,
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
  return result;
}
