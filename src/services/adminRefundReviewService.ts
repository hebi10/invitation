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
