import type {
  MobileInvitationCreationInput,
  MobileInvitationCreationResponse,
} from '../types/mobileInvitation';
import {
  buildApiUrl,
  createHeaders,
  fetchWithRetry,
  readJsonResponse,
} from './apiCore';
import type { MobileBillingPurchaseReceiptInput } from './apiTypes';

export class BillingReviewRequiredError extends Error {
  readonly code = 'BILLING_REVIEW_REQUIRED';
  readonly status = 409;

  constructor() {
    super('이전 결제의 지급 여부를 확인해야 합니다. 추가 결제하지 말고 고객 문의로 결제 내역을 확인해 주세요.');
    this.name = 'BillingReviewRequiredError';
  }
}

async function readBillingFulfillmentResponse<T>(response: Response): Promise<T> {
  if (response.status === 409) {
    const payload = await response.clone().json().catch(() => null) as { code?: unknown } | null;
    if (payload?.code === 'BILLING_REVIEW_REQUIRED') {
      throw new BillingReviewRequiredError();
    }
  }
  return readJsonResponse<T>(response);
}

export async function fulfillMobileBillingPageCreation(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    input: MobileInvitationCreationInput;
    customerIdToken?: string | null;
  }
) {
  const response = await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
      method: 'POST',
      headers: {
        ...createHeaders(payload.customerIdToken ?? undefined),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createInvitationPage',
        purchase: payload.purchase,
        createInput: {
          slugBase: payload.input.slugBase,
          groomKoreanName: payload.input.groomKoreanName,
          brideKoreanName: payload.input.brideKoreanName,
          groomEnglishName: payload.input.groomEnglishName,
          brideEnglishName: payload.input.brideEnglishName,
          theme: payload.input.theme,
        },
      }),
    });
  return readBillingFulfillmentResponse<MobileInvitationCreationResponse>(response);
}

export async function fulfillMobileBillingTicketPack(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    targetPageSlug: string;
    targetToken: string;
  }
) {
  const response = await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
    method: 'POST',
    headers: {
      ...createHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'grantTicketPack',
      purchase: payload.purchase,
      targetPageSlug: payload.targetPageSlug,
      targetToken: payload.targetToken,
    }),
  });
  return readBillingFulfillmentResponse<{ success: boolean; ticketCount: number }>(response);
}

// Retained for verified transactions from before the policy cutoff; new period extensions are disabled.
export async function fulfillMobileBillingPeriodExtension(
  baseUrl: string,
  payload: {
    purchase: MobileBillingPurchaseReceiptInput;
    targetPageSlug: string;
    customerIdToken: string;
  }
) {
  const response = await fetchWithRetry(buildApiUrl(baseUrl, '/api/mobile/billing/fulfill'), {
    method: 'POST',
    headers: {
      ...createHeaders(payload.customerIdToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'extendInvitationPeriod',
      purchase: payload.purchase,
      targetPageSlug: payload.targetPageSlug,
    }),
  });
  return readBillingFulfillmentResponse<{
    success: boolean;
    enabled: boolean;
    startDate: string;
    endDate: string;
    monthsAdded: number;
  }>(response);
}
