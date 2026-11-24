import { getCurrentFirebaseIdToken } from './adminAuth';

export interface AdminRefundReviewRecord {
  transactionIdentifier: string;
  voidedAt: string;
  fulfillmentStatus: 'processing' | 'fulfilled' | 'failed' | null;
  kind: 'pageCreation' | 'ticketPack' | 'periodExtension' | null;
  pageSlug: string | null;
  reviewRequired: true;
}

export interface AdminRefundReviewResult {
  count: number;
  windowDays: number;
  records: AdminRefundReviewRecord[];
}

export async function getAdminRefundReview(signal?: AbortSignal): Promise<AdminRefundReviewResult> {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) throw new Error('관리자 로그인 상태를 확인해 주세요.');
  const response = await fetch('/api/admin/billing/voided-purchases/', {
    method: 'GET', headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal,
  });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? '관리자 로그인 및 권한을 확인해 주세요.'
      : '환불 거래를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  const payload = await response.json() as Partial<AdminRefundReviewResult> & { success?: boolean };
  if (payload.success !== true || !Array.isArray(payload.records) ||
      payload.count !== payload.records.length || payload.windowDays !== 30) {
    throw new Error('환불 거래 응답을 확인하지 못했습니다.');
  }
  return { count: payload.count, windowDays: payload.windowDays, records: payload.records };
}


export type RefundReleaseReason = 'replacement-payment-reviewed' | 'approved-exception' | 'record-correction';
export type RefundAccessReview = {
  transactionIdentifier: string; pageSlug: string; state: 'held' | 'released';
  voidedAt: string; heldAt: string; releasedAt: string | null; releaseReason: RefundReleaseReason | null;
};
export type RefundAccessState = { holdEnabled: boolean; truncated: boolean; holds: RefundAccessReview[] };

async function refundAccessRequest(method: 'GET' | 'POST', body?: object, signal?: AbortSignal) {
  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) throw new Error('관리자 로그인 상태를 확인해 주세요.');
  const response = await fetch('/api/admin/billing/refund-access/', {
    method, headers: { Authorization: `Bearer ${idToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error(typeof payload?.error === 'string' ? payload.error : '환불 검토를 처리하지 못했습니다. 상태를 다시 조회해 주세요.');
  return payload;
}
export async function getRefundAccessState(signal?: AbortSignal): Promise<RefundAccessState> {
  const result = await refundAccessRequest('GET', undefined, signal);
  if (typeof result.holdEnabled !== 'boolean' || typeof result.truncated !== 'boolean' || !Array.isArray(result.holds)) {
    throw new Error('보류 목록 응답을 확인하지 못했습니다.');
  }
  return result;
}
export async function changeRefundAccess(action: 'hold' | 'release', transactionIdentifier: string, releaseReason?: RefundReleaseReason) {
  const result = await refundAccessRequest('POST', { action, transactionIdentifier, confirmed: true, releaseReason });
  if (result.success !== true || result.review?.transactionIdentifier !== transactionIdentifier ||
      result.review?.state !== (action === 'hold' ? 'held' : 'released')) {
    throw new Error('권한 변경 결과를 확인하지 못했습니다. 다시 조회해 주세요.');
  }
  return result as { success: true; changed: boolean; review: RefundAccessReview };
}
