export type RefundReleaseReason = 'replacement-payment-reviewed' | 'approved-exception' | 'record-correction';
export const REFUND_REVIEW_COLLECTION = 'billingRefundReviews';
export class RefundAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'RefundAccessError'; }
}
export interface RefundAccessReview {
  transactionIdentifier: string;
  state: 'held' | 'released';
  eventId: string;
  pageSlug: string;
  voidedAt: string;
  heldAt: string;
  heldByUid: string;
  releasedAt: string | null;
  releasedByUid: string | null;
  releaseReason: RefundReleaseReason | null;
}
export function validRefundTransactionId(id: unknown): id is string {
  return typeof id === 'string' && /^play_[a-f0-9]{64}$/.test(id);
}
export function validRefundReleaseReason(reason: unknown): reason is RefundReleaseReason {
  return reason === 'replacement-payment-reviewed' || reason === 'approved-exception' || reason === 'record-correction';
}
export function isRefundPageCreationGrant(grant: Record<string, unknown> | undefined, id: string) {
  return Boolean(grant && grant.transactionId === id && grant.provider === 'googleplay' &&
    grant.kind === 'pageCreation' && grant.productId === 'page_creation_premium' && grant.status === 'fulfilled' &&
    typeof grant.eventId === 'string' && grant.eventId && !/[\/\\\u0000-\u001f]/.test(grant.eventId) &&
    typeof grant.createdPageSlug === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(grant.createdPageSlug) &&
    typeof grant.appUserId === 'string' && grant.appUserId.trim());
}
export function buildRefundAccessChange(input: {
  action: 'hold' | 'release'; id: string; adminUid: string;
  grant: Record<string, unknown> | undefined; event: Record<string, unknown> | undefined;
  index: Record<string, unknown> | undefined; review: RefundAccessReview | null;
  voidedAt?: string; releaseReason?: RefundReleaseReason; now: Date;
}) {
  const { action, id, adminUid, grant, event, index, review, now } = input;
  const conflict = () => new RefundAccessError(409, '거래와 청첩장 소유권 또는 검토 상태가 일치하지 않습니다. 별도로 확인해 주세요.');
  if (!validRefundTransactionId(id) || !adminUid || !isRefundPageCreationGrant(grant, id) || !grant || !event ||
      event.eventId !== grant.eventId || event.slug !== grant.createdPageSlug ||
      index?.status !== 'active' || index.eventId !== grant.eventId || index.slug !== grant.createdPageSlug ||
      (event.status != null && event.status !== 'active')) throw conflict();
  const deletion = event.deletion as { status?: unknown } | null | undefined;
  if (deletion && ['pending', 'running', 'failed'].includes(String(deletion.status))) throw conflict();
  if (action === 'hold' && event.ownerUid !== grant.appUserId) throw conflict();
  if (review && (review.transactionIdentifier !== id || review.eventId !== grant.eventId || review.pageSlug !== grant.createdPageSlug)) throw conflict();
  const marker = event.billingAccessHold;
  if (action === 'hold') {
    if (!input.voidedAt || !Number.isFinite(Date.parse(input.voidedAt)) || Date.parse(input.voidedAt) > now.getTime()) {
      throw new RefundAccessError(409, 'Google Play의 유효한 환불 기록을 다시 확인해 주세요.');
    }
    if (review?.state === 'held' && marker === id) return { review, changed: false };
    if (review || marker != null) throw conflict();
    const next: RefundAccessReview = {
      transactionIdentifier: id, state: 'held', eventId: grant.eventId as string, pageSlug: grant.createdPageSlug as string,
      voidedAt: new Date(input.voidedAt).toISOString(), heldAt: now.toISOString(),
      heldByUid: adminUid, releasedAt: null, releasedByUid: null, releaseReason: null,
    };
    return { review: next, changed: true };
  }
  if (action !== 'release' || !validRefundReleaseReason(input.releaseReason)) {
    throw new RefundAccessError(400, '보류 해제 사유를 선택해 주세요.');
  }
  if (review?.state === 'released' && marker == null) return { review, changed: false };
  if (review?.state !== 'held' || marker !== id) throw conflict();
  return { review: { ...review, state: 'released' as const, releasedAt: now.toISOString(),
    releasedByUid: adminUid, releaseReason: input.releaseReason }, changed: true };
}
